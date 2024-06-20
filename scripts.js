import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

let app;
let auth;
let db;

const data = { categoria: [], items: [] };
const utils = {
  tipo: ["Pelicula", "Serie", "Anime", "Documental", "Podcast", "Otro"],
};
let itemEditadoId = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

document.addEventListener("DOMContentLoaded", function () {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          cargarColecciones(user.uid);
        } else {
          console.log('No hay usuario autenticado');
        }
      });
    })
    .catch((error) => {
      console.error('Error al configurar la persistencia:', error);
    });
});

document.getElementById("completado").addEventListener("change", function () {
  document.getElementById("completo").innerText = this.checked ? "Finalizado" : "Pendiente";
});

export function abrirPopup(tipo) {
  let arreglado = []
  if (tipo === "item") {
    document.getElementById("popupForm").classList.remove("hidden");
    document.getElementById("agregarItem").classList.remove("hidden");
    document.getElementById("editarItem").classList.add("hidden");
    let $nombre = document.getElementById("nombre");
    

    const choices = new Choices($nombre, {
      shouldSort: false,
      choices: arreglado,
      callbackOnCreateTemplates: function (template) {
        return {
          item: ({ classNames }, data) => {
            return template(`
              <div class="${classNames.item} ${classNames.itemChoice} ${
              data.disabled
                ? classNames.itemDisabled
                : classNames.itemSelectable
            }" data-select-text="${this.config.itemSelectText}" data-choice ${
              data.disabled
                ? 'data-choice-disabled aria-disabled="true"'
                : "data-choice-selectable"
            } data-id="${data.value}" data-value="${data.label}" role="option">
                ${data.img ? `<img src="${data.img}" alt="${data.label}" style="height: 50px; margin-right: 10px;">` : ''}
                <span>${data.label}</span> - <span>${data.type}</span>
              </div>`);
          },
          choice: ({ classNames }, data) => {
            return template(`
              <div class="${classNames.item} ${classNames.itemChoice} ${
              data.disabled
                ? classNames.itemDisabled
                : classNames.itemSelectable
            }" data-select-text="${this.config.itemSelectText}" data-choice ${
              data.disabled
                ? 'data-choice-disabled aria-disabled="true"'
                : "data-choice-selectable"
            } data-id="${data.value}" data-value="${data.label}" role="option">
                ${data.img ? `<img src="${data.img}" alt="${data.label}" style="height: 50px; margin-right: 10px;">` : ''}
                <span>${data.label}</span> - <span>${data.type}</span>
              </div>`);
          },
        };
      }
    });


    $nombre.addEventListener("search", async function (event) {
      let entrada = event.detail.value;
      let datos = await consultaIngreso(entrada);
      arreglado = arreglaDatos(datos);
      choices.setChoices(arreglado, 'value', 'label', true);
    });
    cargaTipoSelect();
    cargaCategoriasSelect();
  } else if (tipo === "categoria") {
    document.getElementById("popupFormCategoria").classList.remove("hidden");
  }
}

export function cerrarPopup() {
  document.getElementById("popupForm").classList.add("hidden");
}

export function cerrarPopupCategoria() {
  document.getElementById("popupFormCategoria").classList.add("hidden");
}

export function cerrarPopupAuth() {
  document.getElementById("popupAuth").classList.add("hidden");
}

export function agregarElemento() {
  let user = auth.currentUser;
  if (user) {
    let item = {
      id: crypto.randomUUID(),
      nombre: document.getElementById("nombre").value,
      tipo: document.getElementById("tipo").value,
      episodios: document.getElementById("episodios").value || "N/A",
      categoria: document.getElementById("categoria").value,
      completado: document.getElementById("completado").checked ? "Sí" : "No",
    };

    data.items.push(item);
    saveToFirebase(user.uid);
    agregarItemLista(item);
    resetInputsItem();
    cerrarPopup();
  } else {
    alert('Por favor, inicie sesión para agregar elementos.');
  }
}

function resetInputsItem() {
  document.getElementById("nombre").value = "";
  document.getElementById("tipo").value = "";
  document.getElementById("episodios").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("completado").checked = false;
}

export function editarElemento(id) {
  resetInputsItem();

  itemEditadoId = id;
  let user = auth.currentUser;
  if (user) {
    const itemRef = doc(db, 'usuarios', user.uid, 'colecciones', id);
    getDoc(itemRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          let item = docSnap.data();
          document.getElementById("nombre").value = item.nombre;
          document.getElementById("tipo").value = item.tipo;
          document.getElementById("episodios").value = item.episodios;
          document.getElementById("categoria").value = item.categoria;
          document.getElementById("completado").checked = item.completado === "Sí";

          document.getElementById("popupForm").classList.remove("hidden");
          document.getElementById("agregarItem").classList.add("hidden");
          document.getElementById("editarItem").classList.remove("hidden");
        }
      })
      .catch((error) => {
        console.error('Error al cargar el elemento:', error);
      });
  }
}


export function guardarEdicion() {
  let $nombre = document.getElementById("nombre");
  let $tipo = document.getElementById("tipo");
  let $episodios = document.getElementById("episodios");
  let $categoria = document.getElementById("categoria");
  let $completado = document.getElementById("completado");

  if (!$nombre.value || !$tipo.value || !$categoria.value) {
    alert("Por favor, completa todos los campos");
    return;
  }

  let item = {
    id: itemEditadoId,
    nombre: $nombre.value,
    tipo: $tipo.value,
    episodios: $episodios.value || "N/A",
    categoria: $categoria.value,
    completado: $completado.checked ? "Sí" : "No",
  };

  let user = auth.currentUser;
  if (user) {
    setDoc(doc(db, 'usuarios', user.uid, 'colecciones', item.id), item)
      .then(() => {
        console.log('Elemento actualizado en Firebase');
        actualizarLista();
        cerrarPopup();
      })
      .catch((error) => {
        console.error('Error al actualizar el elemento:', error);
      });
  }
}

export function agregarCategoria() {
  let $nuevaCategoria = document.getElementById("nuevaCategoria").value;

  if (!$nuevaCategoria) {
    alert("Por favor, ingresa un nombre para la categoría");
    return;
  }

  if (data.categoria.some((categoria) => categoria.nombre === $nuevaCategoria)) {
    alert("La categoría ya existe");
    return;
  }

  let categoria = {
    id: crypto.randomUUID(),
    nombre: $nuevaCategoria,
  };

  data.categoria.push(categoria);
  cargaCategoriasSelect();

  saveToLocalStorage();
  document.getElementById("nuevaCategoria").value = "";
  cerrarPopupCategoria();
}

function cargaCategoriasSelect() {
  let select = document.getElementById("categoria");
  select.innerHTML = "";

  let option = document.createElement("option");
  option.value = "";
  option.text = "Seleccionar Categoría";
  select.appendChild(option);

  data.categoria.forEach((categoria) => {
    let option = document.createElement("option");
    option.value = categoria.id;
    option.text = categoria.nombre;
    select.appendChild(option);
  });
}

function agregarItemLista(item) {
  let card = document.createElement("div");
  card.classList.add("card");
  card.setAttribute("data-id", item.id);

  let title = document.createElement("h3");
  title.textContent = item.nombre;

  let details = document.createElement("p");
  details.innerHTML = `
        Tipo: ${item.tipo}<br>
        Episodios: ${item.episodios}<br>
        Finalizado: ${item.completado}<br>
        Categoría: ${
          data.categoria.find((categoria) => categoria.id === item.categoria)
            .nombre
        }
    `;

  let editButton = document.createElement("button");
  editButton.textContent = "Editar";
  editButton.classList.add("edit-button");
  editButton.addEventListener("click", function () {
    editarElemento(item.id);
  });

  let deleteButton = document.createElement("button");
  deleteButton.classList.add("delete-button");
  deleteButton.addEventListener("click", function () {
    if (confirm("¿Está seguro de que desea eliminar este elemento?")) {
      card.remove();
      removeFromLocalStorage(item.id);
    }
  });

  card.appendChild(title);
  card.appendChild(details);
  card.appendChild(editButton);
  card.appendChild(deleteButton);
  document.getElementById("list").appendChild(card);
}

function agregarCategoriaElemento(categoria) {
  let li = document.createElement("li");
  li.textContent = categoria.nombre;
  li.setAttribute("data-id", categoria.id);

  let deleteButton = document.createElement("button");
  deleteButton.classList.add("delete-button");
  deleteButton.addEventListener("click", function () {
    if (confirm("¿Está seguro de que desea eliminar esta categoría?")) {
      li.remove();
      removeCategoriaFromLocalStorage(categoria.id);
    }
  });

  li.appendChild(deleteButton);
  document.getElementById("categoriaList").appendChild(li);
}

export function saveToLocalStorage() {
  let user = auth.currentUser;
  if (user) {
    saveToFirebase(user.uid);
  } else {
    localStorage.setItem("data", JSON.stringify(data));
  }
}

export function loadFromLocalStorage() {
  let user = auth.currentUser;
  if (user) {
    cargarColecciones(user.uid);
  } else if (localStorage.getItem("data")) {
    data = JSON.parse(localStorage.getItem("data"));
    data.items.forEach((item) => agregarItemLista(item));
    data.categoria.forEach((categoria) => agregarCategoriaElemento(categoria));
  }
}


function removeFromLocalStorage(id) {
  data.items = data.items.filter((item) => item.id !== id);
  saveToLocalStorage();
}

function removeCategoriaFromLocalStorage(id) {
  data.categoria = data.categoria.filter((categoria) => categoria.id !== id);
  saveToLocalStorage();
}

function cargaTipoSelect() {
  let select = document.getElementById("tipo");
  select.innerHTML = "";
  let tipos = utils.tipo;

  let option = document.createElement("option");
  option.value = "";
  option.text = "Seleccionar Tipo";
  select.appendChild(option);

  for (const tipo of tipos) {
    let option = document.createElement("option");
    option.value = tipo;
    option.text = tipo;
    select.appendChild(option);
  }
}

export function buscarElemento() {
  let input = document.getElementById("searchInput").value.toLowerCase();
  let items = document.querySelectorAll(".card");

  items.forEach((item) => {
    let nombre = item.querySelector("h3").textContent.toLowerCase();
    if (nombre.includes(input)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}

export function ordenarPorCategoria() {
  data.items.sort((a, b) => {
    let categoriaA = data.categoria
      .find((categoria) => categoria.id === a.categoria)
      .nombre.toLowerCase();
    let categoriaB = data.categoria
      .find((categoria) => categoria.id === b.categoria)
      .nombre.toLowerCase();
    return categoriaA.localeCompare(categoriaB);
  });
  actualizarLista();
}

function actualizarLista() {
  let list = document.getElementById("list");
  list.innerHTML = "";
  data.items.forEach((item) => agregarItemLista(item));
}

function buscaElemento() {
  let $nombre = document.getElementById("nombre");

  if ($nombre.value.length < 3) {
  }
}

async function consultaIngreso(entrada) {
  // buscamos usando el api de IMDB
  const url = `https://imdb8.p.rapidapi.com/auto-complete?q=${entrada}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': '57f9500b78msh7da6ebd5c5422a9p1b07adjsn0fdf9dff2727',
      'x-rapidapi-host': 'imdb8.p.rapidapi.com'
    }
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data.d; 
  } catch (error) {
    console.error(error);
    return [];
  }
}
function arreglaDatos(datos) {
  return datos.map(obj => ({
    value: obj.id,
    label: obj.l + (obj.y ? ` (${obj.y})` : ''),
    img: obj.i?.imageUrl || '',
    type: obj.q || ''
  }));
}

// function arreglaDatos(datos) {
//   console.log(datos);
//   let salida = [];

//   datos.map(obj => {
//     let img = '';
//     let tipo = '';
//     let titulo = obj.l;
//     if (obj.y) titulo += ` (${obj.y})`;
//     if (obj.i?.imageUrl) { img = obj.i.imageUrl; }
//     if (obj.q) { tipo = obj.q; }
//     salida.push(
//       {
//         value: obj.id,
//         label: titulo,
//         img: img,
//         type: tipo
//       });
//   });
//   return salida;
// }


function iniciarSesion(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Sesión iniciada
      let user = userCredential.user;
      console.log('Sesión iniciada:', user);
      // Cargar colecciones del usuario
      cargarColecciones(user.uid);
    })
    .catch((error) => {
      console.error('Error al iniciar sesión:', error);
    });
}

// Registrar nuevo usuario
export function registrarUsuario() {
  let email = document.getElementById("authEmail").value;
  let password = document.getElementById("authPassword").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      let user = userCredential.user;
      crearListaUsuario(user.uid);
      cerrarPopupAuth();
    })
    .catch((error) => {
      console.error('Error al registrar usuario:', error);
      alert('Error al registrar usuario: ' + error.message);
    });
}


// Crear colecciones para el usuario
export function autenticarUsuario() {
  let email = document.getElementById("authEmail").value;
  let password = document.getElementById("authPassword").value;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      let user = userCredential.user;
      cargarColecciones(user.uid);
      cerrarPopupAuth();
    })
    .catch((error) => {
      console.error('Error al iniciar sesión:', error);
      alert('Error al iniciar sesión: ' + error.message);
    });
}

// Cargar colecciones del usuario
export function cargarColecciones(uid) {
  getDoc(doc(db, 'usuarios', uid))
    .then((docSnap) => {
      if (docSnap.exists()) {
        data.items = docSnap.data().items || [];
        data.categoria = docSnap.data().categoria || [];
        console.log('Datos del usuario:', data);
        actualizarLista();
      } else {
        console.log('No se encontraron colecciones para este usuario.');
      }
    })
    .catch((error) => {
      console.error('Error al cargar colecciones:', error);
    });
}
// Guardar colecciones en Firebase
export function saveToFirebase(uid) {
  setDoc(doc(db, 'usuarios', uid), data)
    .then(() => {
      console.log('Colecciones guardadas en Firebase');
    })
    .catch((error) => {
      console.error('Error al guardar colecciones:', error);
    });
}

export function mostrarPopupAuth(tipo) {
  document.getElementById("popupAuth").classList.remove("hidden");
  if (tipo === 'login') {
    document.getElementById("authTitle").innerText = "Iniciar Sesión";
    document.getElementById("authAction").innerText = "Ingresar";
    document.getElementById("authAction").onclick = autenticarUsuario;
  } else if (tipo === 'register') {
    document.getElementById("authTitle").innerText = "Registrarse";
    document.getElementById("authAction").innerText = "Registrar";
    document.getElementById("authAction").onclick = registrarUsuario;
  }
}

export function crearListaUsuario(uid) {
  setDoc(doc(db, 'usuarios', uid), { items: [], categoria: [] })
    .then(() => {
      console.log('Lista inicial creada para el usuario:', uid);
    })
    .catch((error) => {
      console.error('Error al crear la lista del usuario:', error);
    });
}

