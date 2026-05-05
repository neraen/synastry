<?php

namespace App\Scheduler;

use App\Message\ProcessDailyRemindersMessage;
use App\Message\ProcessPersonalTransitsMessage;
use App\Message\ProcessSkyEventsMessage;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

/**
 * Run with:
 *   php bin/console messenger:consume scheduler_notifications
 */
#[AsSchedule('notifications')]
class NotificationScheduleProvider implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())
            // Check for notifiable personal transits every hour
            ->add(RecurringMessage::every('1 hour', new ProcessPersonalTransitsMessage()))
            // Check for sky events daily at 07:00 UTC
            ->add(RecurringMessage::cron('0 7 * * *', new ProcessSkyEventsMessage()))
            // Send daily reminders at 06:00 UTC (before users' preferred morning hour)
            ->add(RecurringMessage::cron('0 6 * * *', new ProcessDailyRemindersMessage()));
    }
}
