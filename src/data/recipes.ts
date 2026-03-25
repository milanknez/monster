import { Recipe } from '../types';

export const recipes: Recipe[] = [
  {
    "id": "xp_booster",
    "name": "XP Elixír",
    "description": "Zvýší zisk XP na 30 minut (násobitel 2x).",
    "requirements": [
      {
        "type": "crystal",
        "count": 5
      },
      {
        "type": "herb",
        "count": 2
      }
    ],
    "result": {
      "type": "item",
      "id": "xp_booster",
      "amount": 1
    }
  },
  {
    "id": "hp_potion",
    "name": "Lékárnička",
    "description": "Okamžitě obnoví 50 HP a zvýší regeneraci na 15 minut.",
    "requirements": [
      {
        "type": "herb",
        "count": 5
      },
      {
        "type": "energy",
        "count": 1
      }
    ],
    "result": {
      "type": "item",
      "id": "hp_potion",
      "amount": 1
    }
  },
  {
    "id": "energy_drink",
    "name": "Energy Drink",
    "description": "Zvýší maximální energii a dočasně sníží únavu při pohybu.",
    "requirements": [
      {
        "type": "energy",
        "count": 4
      },
      {
        "type": "mineral",
        "count": 2
      }
    ],
    "result": {
      "type": "item",
      "id": "new_res",
      "amount": 1
    }
  },
  {
    "id": "gem_red_1",
    "name": "Rudý Jaspis I",
    "description": "Zvyšuje základní útok monstra o +3.",
    "requirements": [
      {
        "type": "mineral",
        "count": 5
      },
      {
        "type": "energy",
        "count": 2
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_red_1",
      "amount": 1
    }
  },
  {
    "id": "gem_red_3",
    "name": "Rudý Jaspis III",
    "description": "Zvyšuje základní útok monstra o +8.",
    "requirements": [
      {
        "type": "mineral",
        "count": 12
      },
      {
        "type": "magic_crystal",
        "count": 1
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_red_3",
      "amount": 1
    }
  },
  {
    "id": "gem_red_4",
    "name": "Rudý Jaspis IV",
    "description": "Zvyšuje útok monstra o +2%.",
    "requirements": [
      {
        "type": "super_mineral",
        "count": 2
      },
      {
        "type": "magic_crystal",
        "count": 2
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_red_4",
      "amount": 1
    }
  },
  {
    "id": "gem_green_1",
    "name": "Zelený Nefrit I",
    "description": "Zvyšuje základní zdraví monstra o +3.",
    "requirements": [
      {
        "type": "herb",
        "count": 8
      },
      {
        "type": "crystal",
        "count": 2
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_green_1",
      "amount": 1
    }
  },
  {
    "id": "gem_green_4",
    "name": "Zelený Nefrit IV",
    "description": "Zvyšuje zdraví monstra o +2%.",
    "requirements": [
      {
        "type": "herb",
        "count": 20
      },
      {
        "type": "magic_crystal",
        "count": 3
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_green_4",
      "amount": 1
    }
  },
  {
    "id": "gem_white_1",
    "name": "Bílý Křemen I",
    "description": "Zvyšuje základní obranu monstra o +3.",
    "requirements": [
      {
        "type": "crystal",
        "count": 6
      },
      {
        "type": "energy",
        "count": 3
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_white_1",
      "amount": 1
    }
  },
  {
    "id": "gem_white_4",
    "name": "Bílý Křemen IV",
    "description": "Zvyšuje obranu monstra o +2%.",
    "requirements": [
      {
        "type": "magic_crystal",
        "count": 4
      },
      {
        "type": "mineral",
        "count": 10
      }
    ],
    "result": {
      "type": "item",
      "id": "gem_white_4",
      "amount": 1
    }
  }
];