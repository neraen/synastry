#!/usr/bin/env python3
"""
Ton Ciel — construit app/assets/sky/stars.json à partir du catalogue d3-celestial.

Source : https://github.com/ofrohn/d3-celestial (data/stars.6.json, licence BSD-3,
(c) 2015 Olaf Frohn). Le fichier source n'est pas versionné : le télécharger puis

    python3 scripts/build-star-catalog.py chemin/vers/stars.6.json

Sortie :
  - "named" : étoiles brillantes nommées [nom, ascension droite °, déclinaison °, magnitude, teinte]
  - "stars" : toutes les autres jusqu'à MAG_LIMIT [ascension droite °, déclinaison °, magnitude, teinte]
Teinte : 0 bleu, 1 blanc, 2 chaud, 3 rouge (d'après l'indice de couleur B-V).
"""
import json
import math
import os
import sys

MAG_LIMIT = 5.3

# Noms français usuels : (nom, ascension droite en heures, déclinaison en degrés, magnitude).
# Les coordonnées ne servent qu'à retrouver l'étoile dans le catalogue, qui fait foi.
NAMES = [
    ('Sirius', 6.752, -16.72, -1.46),
    ('Canopus', 6.399, -52.70, -0.74),
    ('Arcturus', 14.261, 19.18, -0.05),
    ('Rigil Kentaurus', 14.660, -60.83, -0.27),
    ('Véga', 18.616, 38.78, 0.03),
    ('Capella', 5.278, 46.00, 0.08),
    ('Rigel', 5.242, -8.20, 0.13),
    ('Procyon', 7.655, 5.22, 0.34),
    ('Achernar', 1.629, -57.24, 0.46),
    ('Bételgeuse', 5.919, 7.41, 0.50),
    ('Hadar', 14.064, -60.37, 0.61),
    ('Altaïr', 19.846, 8.87, 0.77),
    ('Acrux', 12.443, -63.10, 0.76),
    ('Aldébaran', 4.599, 16.51, 0.85),
    ('Antarès', 16.490, -26.43, 1.09),
    ('Spica', 13.420, -11.16, 0.97),
    ('Pollux', 7.755, 28.03, 1.14),
    ('Fomalhaut', 22.961, -29.62, 1.16),
    ('Deneb', 20.690, 45.28, 1.25),
    ('Mimosa', 12.795, -59.69, 1.25),
    ('Régulus', 10.140, 11.97, 1.35),
    ('Adhara', 6.977, -28.97, 1.50),
    ('Castor', 7.577, 31.89, 1.58),
    ('Gacrux', 12.519, -57.11, 1.63),
    ('Shaula', 17.560, -37.10, 1.62),
    ('Bellatrix', 5.419, 6.35, 1.64),
    ('Elnath', 5.438, 28.61, 1.65),
    ('Miaplacidus', 9.220, -69.72, 1.68),
    ('Alnilam', 5.604, -1.20, 1.69),
    ('Alnair', 22.137, -46.96, 1.74),
    ('Alnitak', 5.679, -1.94, 1.77),
    ('Alioth', 12.900, 55.96, 1.77),
    ('Dubhé', 11.062, 61.75, 1.79),
    ('Mirfak', 3.405, 49.86, 1.80),
    ('Wezen', 7.140, -26.39, 1.84),
    ('Kaus Australis', 18.403, -34.38, 1.85),
    ('Avior', 8.375, -59.51, 1.86),
    ('Alkaïd', 13.792, 49.31, 1.86),
    ('Sargas', 17.622, -43.00, 1.87),
    ('Menkalinan', 5.992, 44.95, 1.90),
    ('Atria', 16.811, -69.03, 1.92),
    ('Alhena', 6.629, 16.40, 1.93),
    ('Peacock', 20.427, -56.74, 1.94),
    ('Polaris', 2.530, 89.26, 1.98),
    ('Mirzam', 6.378, -17.96, 1.98),
    ('Alphard', 9.460, -8.66, 1.98),
    ('Hamal', 2.120, 23.46, 2.00),
    ('Algieba', 10.333, 19.84, 2.08),
    ('Diphda', 0.727, -17.99, 2.02),
    ('Nunki', 18.921, -26.30, 2.02),
    ('Menkent', 14.111, -36.37, 2.06),
    ('Mirach', 1.163, 35.62, 2.05),
    ('Alphératz', 0.140, 29.09, 2.06),
    ('Rasalhague', 17.582, 12.56, 2.07),
    ('Kochab', 14.845, 74.16, 2.08),
    ('Saïph', 5.796, -9.67, 2.09),
    ('Dénébola', 11.818, 14.57, 2.13),
    ('Algol', 3.136, 40.96, 2.12),
    ('Almach', 2.065, 42.33, 2.26),
    ('Tiaki', 22.711, -46.88, 2.10),
    ('Muhlifain', 12.692, -48.96, 2.17),
    ('Naos', 8.060, -40.00, 2.25),
    ('Aspidiske', 9.285, -59.28, 2.25),
    ('Alphecca', 15.578, 26.71, 2.23),
    ('Mizar', 13.399, 54.93, 2.27),
    ('Sadr', 20.370, 40.26, 2.20),
    ('Schédar', 0.675, 56.54, 2.23),
    ('Eltanin', 17.943, 51.49, 2.23),
    ('Mintaka', 5.533, -0.30, 2.23),
    ('Caph', 0.153, 59.15, 2.27),
    ('Dschubba', 16.006, -22.62, 2.32),
    ('Larawag', 16.836, -34.29, 2.29),
    ('Mérak', 11.031, 56.38, 2.37),
    ('Izar', 14.750, 27.07, 2.37),
    ('Enif', 21.736, 9.88, 2.39),
    ('Ankaa', 0.438, -42.31, 2.39),
    ('Phecda', 11.897, 53.69, 2.44),
    ('Sabik', 17.173, -15.72, 2.43),
    ('Scheat', 23.063, 28.08, 2.42),
    ('Aldéramin', 21.310, 62.59, 2.51),
    ('Aludra', 7.402, -29.30, 2.45),
    ('Markab', 23.079, 15.21, 2.49),
    ('Gienah', 12.263, -17.54, 2.59),
    ('Menkar', 3.038, 4.09, 2.53),
    ('Zosma', 11.235, 20.52, 2.56),
    ('Acrab', 16.091, -19.81, 2.62),
    ('Arneb', 5.545, -17.82, 2.58),
    ('Zubeneschamali', 15.283, -9.38, 2.61),
    ('Zubenelgenubi', 14.848, -16.04, 2.75),
    ('Unukalhai', 15.738, 6.43, 2.65),
    ('Shératan', 1.911, 20.81, 2.64),
    ('Phact', 5.661, -34.07, 2.64),
    ('Alcyone', 3.791, 24.11, 2.87),
    ('Deneb Algedi', 21.784, -16.13, 2.87),
    ('Sadalsuud', 21.526, -5.57, 2.91),
    ('Sadalmelik', 22.096, -0.32, 2.96),
    ('Vindemiatrix', 13.036, 10.96, 2.83),
    ('Porrima', 12.694, -1.45, 2.74),
    ('Tarazed', 19.771, 10.61, 2.72),
    ('Albiréo', 19.512, 27.96, 3.08),
    ('Algénib', 0.221, 15.18, 2.83),
    ('Kaus Media', 18.350, -29.83, 2.70),
    ('Mebsuta', 6.732, 25.13, 2.98),
    ('Tejat', 6.383, 22.51, 2.88),
    ('Cor Caroli', 12.934, 38.32, 2.90),
    ('Rasalgethi', 17.244, 14.39, 3.10),
    ('Kornephoros', 16.504, 21.49, 2.77),
]


def tint(bv):
    if bv is None:
        return 1
    if bv < 0.0:
        return 0
    if bv < 0.45:
        return 1
    if bv < 1.4:
        return 2
    return 3


def separation(ra1, dec1, ra2, dec2):
    a1, d1, a2, d2 = map(math.radians, (ra1, dec1, ra2, dec2))
    c = math.sin(d1) * math.sin(d2) + math.cos(d1) * math.cos(d2) * math.cos(a1 - a2)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as fh:
        features = json.load(fh)["features"]

    catalog = []
    for f in features:
        mag = f["properties"]["mag"]
        if mag > MAG_LIMIT:
            continue
        lon, dec = f["geometry"]["coordinates"]
        try:
            bv = float(f["properties"].get("bv"))
        except (TypeError, ValueError):
            bv = None
        catalog.append({"ra": lon % 360, "dec": dec, "mag": mag, "tint": tint(bv), "name": None})

    missing = []
    for name, ra_h, dec, mag in NAMES:
        best, best_sep = None, 1.5
        for star in catalog:
            if star["name"] or abs(star["mag"] - mag) > 1.0:
                continue
            sep = separation(ra_h * 15, dec, star["ra"], star["dec"])
            if sep < best_sep:
                best, best_sep = star, sep
        if best is None:
            missing.append(name)
        else:
            best["name"] = name
            if best_sep > 0.3:
                print(f"  écart {best_sep:.2f}° pour {name} (catalogue retenu)")

    named = [[s["name"], round(s["ra"], 2), round(s["dec"], 2), round(s["mag"], 1) + 0.0, s["tint"]]
             for s in catalog if s["name"]]
    stars = [[round(s["ra"], 2), round(s["dec"], 2), round(s["mag"], 1), s["tint"]]
             for s in catalog if not s["name"]]
    named.sort(key=lambda s: s[3])
    stars.sort(key=lambda s: s[2])

    out = os.path.join(os.path.dirname(__file__), "..", "assets", "sky", "stars.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"named": named, "stars": stars}, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"{len(named)} étoiles nommées, {len(stars)} autres -> {os.path.normpath(out)}")
    if missing:
        print("Introuvables dans le catalogue :", ", ".join(missing))


if __name__ == "__main__":
    main()
