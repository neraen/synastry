<?php
// Read-only readiness: migrations, mapped columns, JWT pair and FPM.
require dirname(__DIR__, 2).'/vendor/autoload.php';
try {
    (new Symfony\Component\Dotenv\Dotenv())->usePutenv()->bootEnv(dirname(__DIR__, 2).'/.env');
    $kernel = new App\Kernel('prod', false);
    $kernel->boot();
    $em = $kernel->getContainer()->get('doctrine')->getManager();
    $db = $em->getConnection();
    $executed = $db->fetchFirstColumn('SELECT version FROM doctrine_migration_versions');
    foreach (glob(dirname(__DIR__, 2).'/migrations/Version*.php') as $file) {
        $version = 'DoctrineMigrations\\'.basename($file, '.php');
        if (!in_array($version, $executed, true)) {
            throw new RuntimeException('Pending database migration');
        }
    }
    $columns = [];
    foreach ($db->fetchAllAssociative('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()') as $row) {
        $columns[$row['TABLE_NAME']][$row['COLUMN_NAME']] = true;
    }
    foreach ($em->getMetadataFactory()->getAllMetadata() as $metadata) {
        if ($metadata->isMappedSuperclass || $metadata->isEmbeddedClass) { continue; }
        $table = $metadata->getTableName();
        foreach ($metadata->getColumnNames() as $column) {
            if (!isset($columns[$table][$column])) { throw new RuntimeException('Missing mapped column'); }
        }
        foreach ($metadata->getAssociationMappings() as $association) {
            foreach ($association['joinColumns'] ?? [] as $join) {
                if (!isset($columns[$table][$join['name']])) { throw new RuntimeException('Missing association column'); }
            }
            if (isset($association['joinTable'])) {
                $joinTable = $association['joinTable'];
                foreach (array_merge($joinTable['joinColumns'], $joinTable['inverseJoinColumns']) as $join) {
                    if (!isset($columns[$joinTable['name']][$join['name']])) { throw new RuntimeException('Missing join table column'); }
                }
            }
        }
    }
    $private = openssl_pkey_get_private(file_get_contents(getenv('JWT_SECRET_KEY')), getenv('JWT_PASSPHRASE'));
    $public = openssl_pkey_get_public(file_get_contents(getenv('JWT_PUBLIC_KEY')));
    if (!$private || !$public || openssl_pkey_get_details($private)['key'] !== openssl_pkey_get_details($public)['key']) {
        throw new RuntimeException('Invalid JWT key pair');
    }
    if (PHP_SAPI === 'cli' && !in_array('--startup', $argv ?? [], true)) {
        $socket = @fsockopen('127.0.0.1', 9000, $errno, $error, 2);
        if (!$socket) { throw new RuntimeException('FPM not ready'); }
        fclose($socket);
    }
    echo "ok\n";
} catch (Throwable $exception) {
    // Never return connection strings, stack traces or secrets to HTTP clients.
    if (PHP_SAPI !== 'cli') { http_response_code(503); }
    else { fwrite(STDERR, 'Readiness failed: '.get_class($exception)."\n"); }
    echo "not ready\n";
    exit(1);
}
