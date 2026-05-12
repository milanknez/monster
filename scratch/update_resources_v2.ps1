$filePath = "d:\wamp64\www\monster\src\data\resources.ts"
$content = Get-Content $filePath -Raw
$items = @"
  },
  "wooden_shield": {
    "color": "#94a3b8",
    "label": { "cz": "Dřevěný štít", "en": "Wooden Shield", "sk": "Drevený štít" },
    "icon": "🛡️",
    "category": "relic",
    "rarity": "Běžná",
    "description": { 
      "cz": "Malý, opotřebovaný štít, který poskytuje základní ochranu.", 
      "en": "A small, worn shield providing basic protection.", 
      "sk": "Malý, opotrebovaný štít, ktorý poskytuje základnú ochranu." 
    },
    "dropWeight": 15, "dropMin": 1, "dropMax": 1,
    "stats": { "def": 2 },
    "hasCustomIcon": true, "customIcon": "wooden_shield"
  },
  "rusty_nail": {
    "color": "#94a3b8",
    "label": { "cz": "Zrezivělý hřebík", "en": "Rusty Nail", "sk": "Zhrdzavený klinec" },
    "icon": "📌",
    "category": "relic",
    "rarity": "Běžná",
    "description": { 
      "cz": "Starý a zrezivělý hřebík. Pořád může ublížit.", 
      "en": "An old and rusty nail. It can still hurt.", 
      "sk": "Starý a zhrdzavený klinec. Stále môže ublížiť." 
    },
    "dropWeight": 15, "dropMin": 1, "dropMax": 1,
    "stats": { "atk": 2 },
    "hasCustomIcon": true, "customIcon": "rusty_nail"
  },
  "old_glove": {
    "color": "#94a3b8",
    "label": { "cz": "Stará rukavice", "en": "Old Glove", "sk": "Stará rukavica" },
    "icon": "🧤",
    "category": "relic",
    "rarity": "Běžná",
    "description": { 
      "cz": "Potrhaná kožená rukavice. Trochu chrání ruku.", 
      "en": "A tattered leather glove. Offers slight protection.", 
      "sk": "Potrhaná kožená rukavica. Trochu chráni ruku." 
    },
    "dropWeight": 20, "dropMin": 1, "dropMax": 1,
    "stats": { "def": 1 },
    "hasCustomIcon": true, "customIcon": "old_glove"
  },
  "dog_paw": {
    "color": "#94a3b8",
    "label": { "cz": "Psí tlapka", "en": "Dog Paw", "sk": "Psia labka" },
    "icon": "🐾",
    "category": "relic",
    "rarity": "Běžná",
    "description": { 
      "cz": "Zaschlý otisk tlapky. Přináší divokou sílu.", 
      "en": "A dried paw print. Brings wild power.", 
      "sk": "Zaschnutý odtlačok labky. Prináša divokú silu." 
    },
    "dropWeight": 20, "dropMin": 1, "dropMax": 1,
    "stats": { "atk": 1 },
    "hasCustomIcon": true, "customIcon": "dog_paw"
  }
};
"@

if ($content -match "\r\n") {
    $newLine = "\r\n"
} else {
    $newLine = "\n"
}

# Find the last "  }" and replace "  }`n};" with the new items
$pattern = "  }$newLine};"
if ($content.Contains($pattern)) {
    $newContent = $content.Replace($pattern, $items)
    Set-Content $filePath -Value $newContent -NoNewline
    Write-Host "Successfully updated $filePath"
} else {
    # Fallback if pattern not found exactly
    Write-Error "Pattern not found. Trying fallback..."
    $content = $content.TrimEnd()
    if ($content.EndsWith("};")) {
        $newContent = $content.Substring(0, $content.Length - 2) + $items
        Set-Content $filePath -Value $newContent -NoNewline
        Write-Host "Successfully updated $filePath (fallback)"
    } else {
        Write-Error "Failed to update $filePath"
    }
}
