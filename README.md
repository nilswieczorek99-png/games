# Spiele

Kleine Browser-Spiele, gehostet mit GitHub Pages.

**Übersicht:** https://nilswieczorek99-png.github.io/games/

| Ordner | Spiel | Link |
| --- | --- | --- |
| `knobelkiste/` | Wochentag-Trainer, Sudoku, Kreuzworträtsel, Galgenmännchen, Rätsel, Markenraten | https://nilswieczorek99-png.github.io/games/knobelkiste/ |
| `sternenkessel/` | 3D-Rollenspiel (Godot-Web-Export) | https://nilswieczorek99-png.github.io/games/sternenkessel/ |
| `tiefenheim/` | Aufbauspiel mit Zwergensiedlung | https://nilswieczorek99-png.github.io/games/tiefenheim/ |
| `lindenhof/` | Pferdespiel (Godot-Web-Export) | https://nilswieczorek99-png.github.io/games/lindenhof/ |

## Neues Spiel hinzufügen

1. Neuen Ordner anlegen, z. B. `mein-spiel/`, mit einer `index.html` darin.
2. In der `index.html` im Hauptordner einen Eintrag in der Liste ergänzen.
3. Hochladen – nach 1–2 Minuten ist das Spiel unter `…/games/mein-spiel/` erreichbar.

## Aufs Handy

- **iPhone:** Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- **Android:** Link in Chrome öffnen → Menü (⋮) → „App installieren“.

Bei Updates eines Spiels in dessen `sw.js` die `VERSION` hochzählen, damit installierte Apps die neue Version laden.

## Sternenkessel und Lindenhof aktualisieren

`sternenkessel/` und `lindenhof/` sind Web-Exporte aus Godot 4.3 (Preset „Web“, ohne Threads). Neu exportieren und den Inhalt von `build/web/` in den jeweiligen Ordner kopieren.
