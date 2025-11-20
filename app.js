// js/app.js
// IMPORTANT: remplace par ta config Firebase
const firebaseConfig = {
  apiKey: "REPLACE_APIKEY",
  authDomain: "REPLACE_PROJECT.firebaseapp.com",
  projectId: "REPLACE_PROJECT",
  storageBucket: "REPLACE_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// init
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI refs
const signinBtn = document.getElementById('signinBtn');
const userArea = document.getElementById('userArea');
const navbtns = document.querySelectorAll('.navbtn');
const views = document.querySelectorAll('.view');
const darkToggle = document.getElementById('darkToggle');

// simple routing
navbtns.forEach(b=>{
  b.addEventListener('click', () => {
    document.querySelector('.navbtn.active')?.classList.remove('active');
    b.classList.add('active');
    const view = b.dataset.view;
    views.forEach(v=>v.classList.remove('visible'));
    document.getElementById('view-'+view).classList.add('visible');
  });
});

// auth
signinBtn.addEventListener('click', async ()=>{
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch(e){ console.error(e) }
});

auth.onAuthStateChanged(user=>{
  if(user){
    userArea.innerHTML = `<img src="${user.photoURL||''}" alt="u" class="avatar"> <span>${user.displayName}</span> <button id="signoutBtn">Déconnexion</button>`;
    document.getElementById('signoutBtn').addEventListener('click', ()=>auth.signOut());
    startAppListeners(user);
  } else {
    userArea.innerHTML = `<button id="signinBtn">Se connecter</button>`;
    document.getElementById('signinBtn').addEventListener('click', async ()=>{
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    });
    stopAppListeners();
  }
});

// dark mode
darkToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  localStorage.setItem('dark', document.body.classList.contains('dark') ? '1' : '0');
});
if(localStorage.getItem('dark')==='1') document.body.classList.add('dark');

// ---------- Data logic ----------
let unsubscribe = [];

// helpers
function collectionForUser(col, uid){
  // structure multi-tenant: store ownerId
  return db.collection(col).where('ownerId','==',uid);
}

// Start listeners when user logged in
function startAppListeners(user){
  // characters realtime
  const unsubChars = collectionForUser('characters', user.uid)
    .onSnapshot(sn=>{
      const list = document.getElementById('charactersList');
      list.innerHTML = '';
      sn.forEach(doc=>{
        const d = doc.data();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<strong>${d.name}</strong><div class="muted">${d.class || ''} — Lvl ${d.level || 1}</div>
          <div style="margin-top:8px"><button data-id="${doc.id}" class="editChar">Edit</button>
          <button data-id="${doc.id}" class="delChar">Suppr</button></div>`;
        list.appendChild(card);
      });
      // attach handlers
      document.querySelectorAll('.editChar').forEach(btn=>{
        btn.onclick = ()=>openCharacterEditor(btn.dataset.id);
      });
      document.querySelectorAll('.delChar').forEach(btn=>{
        btn.onclick = ()=>db.collection('characters').doc(btn.dataset.id).delete();
      });
    });

  // campaigns realtime
  const unsubCamps = collectionForUser('campaigns', user.uid)
    .onSnapshot(sn=>{
      const list = document.getElementById('campaignsList');
      list.innerHTML = '';
      sn.forEach(doc=>{
        const d = doc.data();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<strong>${d.name}</strong><div class="muted">${d.description || ''}</div>
          <div style="margin-top:8px"><button data-id="${doc.id}" class="openCamp">Ouvrir</button>
          <button data-id="${doc.id}" class="delCamp">Suppr</button></div>`;
        list.appendChild(card);
      });
      document.querySelectorAll('.openCamp').forEach(btn=>{
        btn.onclick = ()=>openCampaignEditor(btn.dataset.id);
      });
      document.querySelectorAll('.delCamp').forEach(btn=>{
        btn.onclick = ()=>db.collection('campaigns').doc(btn.dataset.id).delete();
      });
    });

  unsubscribe.push(unsubChars, unsubCamps);
}

// stop listeners on signout
function stopAppListeners(){
  unsubscribe.forEach(u=>u());
  unsubscribe = [];
  document.getElementById('charactersList').innerHTML = '';
  document.getElementById('campaignsList').innerHTML = '';
}

// create new character
document.getElementById('newCharacter').addEventListener('click', ()=>{
  openCharacterEditor();
});

function openCharacterEditor(id){
  const panel = document.getElementById('characterEditor');
  panel.hidden = false;
  const form = document.getElementById('charForm');
  document.getElementById('charTitle').textContent = id ? 'Éditer fiche' : 'Nouvelle fiche';
  if(!id){
    form.reset();
    form.dataset.id = '';
  } else {
    db.collection('characters').doc(id).get().then(snap=>{
      const d = snap.data();
      form.name.value = d.name || '';
      form['class'].value = d.class || '';
      form.level.value = d.level || 1;
      form.notes.value = d.notes || '';
      form.str.value = d.str || 10;
      form.dex.value = d.dex || 10;
      form.con.value = d.con || 10;
      form.int.value = d.int || 10;
      form.wis.value = d.wis || 10;
      form.cha.value = d.cha || 10;
      form.dataset.id = id;
    });
  }
  document.getElementById('closeChar').onclick = ()=>panel.hidden = true;
}

document.getElementById('charForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const user = auth.currentUser;
  if(!user) return alert('Connecte-toi d’abord');
  const f = e.target;
  const payload = {
    ownerId: user.uid,
    name: f.name.value,
    class: f['class'].value,
    level: Number(f.level.value||1),
    notes: f.notes.value,
    str: Number(f.str.value||10),
    dex: Number(f.dex.value||10),
    con: Number(f.con.value||10),
    int: Number(f.int.value||10),
    wis: Number(f.wis.value||10),
    cha: Number(f.cha.value||10),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if(f.dataset.id){
    await db.collection('characters').doc(f.dataset.id).update(payload);
  } else {
    await db.collection('characters').add(payload);
  }
  document.getElementById('characterEditor').hidden = true;
});

// campaigns create / open editor with realtime doc editing
document.getElementById('newCampaign').addEventListener('click', ()=>{
  openCampaignEditor();
});

let campListener = null;
function openCampaignEditor(id){
  const panel = document.getElementById('campaignEditor');
  panel.hidden = false;
  const docArea = document.getElementById('campDoc');
  if(campListener) campListener(); // remove previous
  if(!id){
    document.getElementById('campTitle').textContent = 'Nouvelle campagne';
    document.getElementById('campName').value = '';
    docArea.textContent = 'Écris la campagne ici — éditable en temps réel...';
    document.getElementById('saveCampaign').onclick = async ()=>{
      const user = auth.currentUser; if(!user) return alert('Connecte-toi');
      const name = document.getElementById('campName').value || 'Campagne sans titre';
      const newDoc = await db.collection('campaigns').add({
        ownerId: user.uid, name, description:'', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('campaigns').doc(newDoc.id).collection('docs').add({
        content: docArea.innerHTML, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      panel.hidden = true;
    };
  } else {
    // open campaign with realtime doc binding
    document.getElementById('campTitle').textContent = 'Edition campagne';
    const docsCol = db.collection('campaigns').doc(id).collection('docs').orderBy('updatedAt','desc');
    campListener = docsCol.limit(1).onSnapshot(snap=>{
      if(snap.empty) { docArea.innerHTML = ''; return; }
      const d = snap.docs[0].data();
      docArea.innerHTML = d.content || '';
    });
    // save edits (simple throttle)
    let saveTimeout = null;
    docArea.addEventListener('input', ()=>{
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async ()=>{
        const user = auth.currentUser; if(!user) return;
        // append new doc version
        await db.collection('campaigns').doc(id).collection('docs').add({
          content: docArea.innerHTML,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }, 800);
    });
    document.getElementById('saveCampaign').onclick = ()=>panel.hidden = true;
  }
  document.getElementById('closeCamp').onclick = ()=>{
    panel.hidden = true;
    if(campListener) { campListener(); campListener = null; }
  };
}

// Combat tracker (client-side)
const combatList = document.getElementById('combatList');
document.getElementById('addCombat').addEventListener('click', ()=>{
  const name = document.getElementById('combatName').value || 'Anonyme';
  const init = Number(document.getElementById('combatInit').value||0);
  const row = document.createElement('div');
  row.className='card';
  row.innerHTML = `<strong>${name}</strong> — Init ${init} <button class="remove">✖</button>`;
  row.dataset.init = init;
  combatList.appendChild(row);
  document.getElementById('combatName').value='';
  document.getElementById('combatInit').value='';
  row.querySelector('.remove').onclick = ()=>row.remove();
});
document.getElementById('startRound').addEventListener('click', ()=>{
  const entries = Array.from(combatList.children).sort((a,b)=>Number(b.dataset.init)-Number(a.dataset.init));
  combatList.innerHTML = '';
  entries.forEach(e=>combatList.appendChild(e));
});

// small helper: show recent area
document.getElementById('recentArea').innerHTML = `<div class="card">Bienvenue sur DND Hub — commencez par créer des fiches et une campagne.</div>`;