(() => {
'use strict';

const classes = {
 priest:   { side:'hunt', name:'Священник', attack:'Освящённый луч', power:'Круг очищения', speed:2.65, range:5.8, arc:.27, damage:27, interval:.52, color:'gold' },
 hunter:   { side:'hunt', name:'Охотник', attack:'Дальний выстрел', power:'Световая вспышка', speed:2.95, range:8.5, arc:.15, damage:38, interval:.92, color:'ember' },
 medic:    { side:'hunt', name:'Лекарь', attack:'Быстрые импульсы', power:'Исцеление команды', speed:2.85, range:4.4, arc:.36, damage:16, interval:.33, color:'blue' },
 guardian: { side:'hunt', name:'Страж', attack:'Взмах щитом', power:'Защитный купол', speed:2.35, range:2.5, arc:1.05, damage:36, interval:.67, sweep:true, color:'gold' },
 ghost:    { side:'spirit', name:'Монастырский дух', attack:'Холодный захват', power:'Невидимость', speed:2.85, range:2.25, arc:.64, damage:24, interval:.54, color:'blue' },
 wraith:   { side:'spirit', name:'Теневой призрак', attack:'Быстрый выпад', power:'Теневой рывок', speed:3.30, range:1.65, arc:.48, damage:21, interval:.36, color:'violet' },
 cultist:  { side:'spirit', name:'Призрачная монахиня', attack:'Проклятие на расстоянии', power:'Кража жизни', speed:2.65, range:5.5, arc:.27, damage:26, interval:.75, color:'violet' },
 demon:    { side:'spirit', name:'Полтергейст', attack:'Широкая волна', power:'Удар с отбрасыванием', speed:2.35, range:3.4, arc:.78, damage:31, interval:1, sweep:true, color:'ember' }
};

function picker(hunters, spirits, box, portrait, onTeam = () => {}) {
 let side = 'hunt';
 const selected = { hunt:'priest', spirit:'ghost' };
 function render() {
  hunters.setAttribute('aria-pressed', String(side === 'hunt'));
  spirits.setAttribute('aria-pressed', String(side === 'spirit'));
  if (box.dataset.side !== side) {
   box.dataset.side = side;
   box.replaceChildren();
   for (const [id, config] of Object.entries(classes)) {
    if (config.side !== side) continue;
    const card = document.createElement('button'), image = document.createElement('img');
    const title = document.createElement('b'), attack = document.createElement('small'), power = document.createElement('span');
    card.type = 'button';
    card.className = 'netClass';
    card.dataset.character = id;
    image.src = portrait(id);
    image.alt = '';
    title.textContent = config.name;
    attack.textContent = config.attack;
    power.textContent = config.power;
    card.append(image, title, attack, power);
    card.onclick = () => { selected[side] = id; render(); };
    box.append(card);
   }
  }
  for (const card of box.children) card.setAttribute('aria-pressed', String(card.dataset.character === selected[side]));
 }
 function choose(team) { side = team; render(); onTeam(); }
 hunters.onclick = () => choose('hunt');
 spirits.onclick = () => choose('spirit');
 return { render, get side() { return side; }, get character() { return selected[side]; } };
}

function renderRoster(box, members) {
 box.replaceChildren();
 for (const [side, name] of [['hunt','Охотники'],['spirit','Духи']]) {
  const team = members.filter(member => classes[member.character]?.side === side);
  const group = document.createElement('div'), title = document.createElement('h3');
  const count = document.createElement('span'), list = document.createElement('ul');
  count.textContent = team.length + '/4';
  title.append(name + ' ', count);
  for (const {character, label} of team) {
   const item = document.createElement('li');
   item.textContent = classes[character].name + (label ? ' · ' + label : '');
   list.append(item);
  }
  group.append(title,list);
  box.append(group);
 }
}

window.ObitelCharacters = { classes, picker, renderRoster };
})();
