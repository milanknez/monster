const fs = require('fs');
const path = require('path');

const ids = ['073','074','075','076','077','078','079','080','081','082','083','084'];
const dir = path.join(__dirname, 'src', 'data', 'monsters');

ids.forEach(id => {
  const filePath = path.join(dir, id + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.stats.hp = Math.floor(Math.random() * 40) + 120; // 120-160
  data.stats.attack = Math.floor(Math.random() * 15) + 35; // 35-50
  data.stats.defense = Math.floor(Math.random() * 10) + 12; // 12-22

  if (data.type === 'Ohnivá') {
    data.abilities = [
      { name: "Spalující žár", description: "Vystřelí ohnivou kouli, která silně popálí cíl.", type: "attack", chance: 75, value: 1.8 },
      { name: "Žhavý krunýř", description: "Obalí se aurou ohně, čímž si dočasně posílí štít proti zranění.", type: "defense", chance: 60, value: 0.3 }
    ];
  } else if (data.type === 'Přírodní') {
    data.abilities = [
      { name: "Divoké šlahouny", description: "Země pod nepřítelem ožije a tvrdě ho šlehne kořeny.", type: "attack", chance: 70, value: 1.7 },
      { name: "Fotosyntéza", description: "Načasuje si buněčnou obnovu, díky které se mírně regeneruje po určitý čas.", type: "regen", chance: 65, value: 0.15 }
    ];
  } else if (data.type === 'Elektrická') {
    data.abilities = [
      { name: "Bleskový řetězec", description: "Vyšle spršku smrtících blesků na svůj cíl.", type: "attack", chance: 80, value: 1.6 },
      { name: "Klektavý šok", description: "Uštědří paralytickou ránu, která v cíli usadí tikot elektrické bolesti.", type: "curse", chance: 70, value: 0.15 }
    ];
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('Updated ' + id);
});
