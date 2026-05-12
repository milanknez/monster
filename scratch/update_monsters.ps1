$monsters = Get-ChildItem d:\wamp64\www\monster\src\data\monsters\*.json
foreach ($file in $monsters) {
    $json = Get-Content $file.FullName -Raw | ConvertFrom-Json
    
    # Ensure type is an object
    $czType = if ($json.type.cz) { $json.type.cz } else { $json.type }
    $enType = ""; $skType = ""
    
    if ($czType -eq 'Ohnivá') { $enType = 'Fire'; $skType = 'Ohnivá' }
    elseif ($czType -eq 'Vodní') { $enType = 'Water'; $skType = 'Vodná' }
    elseif ($czType -eq 'Přírodní') { $enType = 'Nature'; $skType = 'Prírodná' }
    elseif ($czType -eq 'Elektrická') { $enType = 'Electric'; $skType = 'Elektrická' }
    else { $enType = $czType; $skType = $czType }

    $json.type = [PSCustomObject]@{
        cz = $czType
        en = $enType
        sk = $skType
    }
    
    # Ensure rarity is an object
    $czRarity = if ($json.rarity.cz) { $json.rarity.cz } else { $json.rarity }
    $enRarity = ""; $skRarity = ""
    
    if ($czRarity -eq 'Běžná') { $enRarity = 'Common'; $skRarity = 'Bežná' }
    elseif ($czRarity -eq 'Vzácná') { $enRarity = 'Rare'; $skRarity = 'Vzácna' }
    elseif ($czRarity -eq 'Epická') { $enRarity = 'Epic'; $skRarity = 'Epická' }
    elseif ($czRarity -eq 'Legendární') { $enRarity = 'Legendary'; $skRarity = 'Legendárna' }
    else { $enRarity = $czRarity; $skRarity = $czRarity }

    $json.rarity = [PSCustomObject]@{
        cz = $czRarity
        en = $enRarity
        sk = $skRarity
    }

    # Ensure name is an object
    if ($json.name -is [string]) {
        $name = $json.name
        $json.name = [PSCustomObject]@{ cz=$name; en=$name; sk=$name }
    } elseif (-not $json.name.sk) {
        $json.name = [PSCustomObject]@{ cz=$json.name.cz; en=$json.name.en; sk=$json.name.cz }
    }

    # Ensure description is an object
    if ($json.description -is [string]) {
        $desc = $json.description
        $json.description = [PSCustomObject]@{ cz=$desc; en=$desc; sk=$desc }
    } elseif (-not $json.description.sk) {
        $json.description = [PSCustomObject]@{ cz=$json.description.cz; en=$json.description.en; sk=$json.description.cz }
    }

    # Abilities
    if ($json.abilities) {
        foreach ($ab in $json.abilities) {
            if ($ab.name -is [string]) {
                $n = $ab.name; $ab.name = [PSCustomObject]@{ cz=$n; en=$n; sk=$n }
            } elseif (-not $ab.name.sk) {
                $ab.name = [PSCustomObject]@{ cz=$ab.name.cz; en=$ab.name.en; sk=$ab.name.cz }
            }
            if ($ab.description -is [string]) {
                $d = $ab.description; $ab.description = [PSCustomObject]@{ cz=$d; en=$d; sk=$d }
            } elseif (-not $ab.description.sk) {
                $ab.description = [PSCustomObject]@{ cz=$ab.description.cz; en=$ab.description.en; sk=$ab.description.cz }
            }
        }
    }

    # Save back
    $json | ConvertTo-Json -Depth 10 | Set-Content $file.FullName
}
echo "Done updating $($monsters.Count) monsters."
