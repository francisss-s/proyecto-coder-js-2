/* eslint-disable no-undef */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js'
import { getAuth, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js'
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js'
import { firebaseConfig, rapidApiConfig } from './config.js'

let searchTimeout
let selectedItem = null
const fireBaseConf = {
  apiKey: firebaseConfig.FIREBASE_API_KEY,
  authDomain: firebaseConfig.FIREBASE_AUTH_DOMAIN,
  databaseURL: firebaseConfig.FIREBASE_DATABASE_URL,
  projectId: firebaseConfig.FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfig.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfig.FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfig.FIREBASE_APP_ID,
  measurementId: firebaseConfig.FIREBASE_MEASUREMENT_ID
}

class FirebaseApp {
  constructor (config) {
    this.app = initializeApp(config)
    this.auth = getAuth(this.app)
    this.db = getFirestore(this.app)
    this.data = { categoria: [], items: [] }
    this.itemEditadoId = null
    this.uid = null
  }

  async init () {
    await setPersistence(this.auth, browserLocalPersistence)
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        document.getElementById('login').style.display = 'none'
        document.getElementById('register').style.display = 'none'
        document.getElementById('logoutBtn').style.display = 'block'
        this.uid = user.uid
        this.cargarColecciones()
      } else {
        document.getElementById('login').style.display = 'block'
        document.getElementById('register').style.display = 'block'
        document.getElementById('logoutBtn').style.display = 'none'
      }
    })
  }

  async cargarColecciones () {
    try {
      const docSnap = await getDoc(doc(this.db, 'usuarios', this.uid))

      if (docSnap.exists()) {
        this.data.items = docSnap.data().items || []
        this.data.categoria = docSnap.data().categoria || []

        data = this.data
        actualizarLista()
      } else {
        console.error('No se encontró el documento')
      }
    } catch (error) {
      console.error('Error al cargar colecciones:', error)
    }
  }

  async saveToFirebase (uid) {
    try {
      await setDoc(doc(this.db, 'usuarios', uid), this.data)
    } catch (error) {
      console.error('Error al guardar colecciones:', error)
    }
  }

  async agregarElemento (item, tipo) {
    const user = this.auth.currentUser
    if (user) {
      if (tipo === 'item') {
        this.data.items.push(item)
        await this.saveToFirebase(user.uid)
      } else {
        this.data.categoria.push(item)
        await this.saveToFirebase(user.uid)
      }
    } else {
      Swal.fire('Error', 'Por favor, inicie sesión para agregar elementos.', 'error')
    }
  }

  async editarElemento (item) {
    const user = this.auth.currentUser
    if (user) {
      try {
        await setDoc(doc(this.db, 'usuarios', user.uid, 'colecciones', item.id), item)
      } catch (error) {
        console.error('Error al actualizar el elemento:', error)
      }
    }
  }

  async iniciarSesion (email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password)
      const user = userCredential.user
      this.uid = user.uid
      await this.cargarColecciones()
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
    }
  }

  async registrarUsuario (email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password)
      const user = userCredential.user
      await this.crearListaUsuario(user.uid)
    } catch (error) {
      console.error('Error al registrar usuario:', error)
      Swal.fire('Error', 'Error al registrar usuario: ' + error.message, 'error')
    }
  }

  async crearListaUsuario (uid) {
    try {
      await setDoc(doc(this.db, 'usuarios', uid), { items: [], categoria: [] })
    } catch (error) {
      console.error('Error al crear la lista del usuario:', error)
    }
  }

  async cerrarSesion () {
    try {
      await signOut(this.auth)
      Swal.fire('Éxito', 'Sesión cerrada correctamente.', 'success')
      localStorage.removeItem('data')
      data = { categoria: [], items: [] }
      actualizarLista()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      Swal.fire('Error', 'Error al cerrar sesión: ' + error.message, 'error')
    }
  }
}

const app = new FirebaseApp(fireBaseConf)
document.addEventListener('DOMContentLoaded', async function () {
  await app.init()
  document.getElementById('completado').addEventListener('change', function () {
    document.getElementById('completo').innerText = this.checked ? 'Finalizado' : 'Pendiente'
  })
  loadFromLocalStorage()
})

let data = { categoria: [], items: [] }

function abrirPopup (tipo) {
  if (tipo === 'item') {
    document.getElementById('popupForm').classList.remove('hidden')
    document.getElementById('agregarItem').classList.remove('hidden')
    document.getElementById('editarItem').classList.add('hidden')
    cargaNombreSelect()
    cargaTipoSelect()
    cargaCategoriasSelect()
  } else if (tipo === 'categoria') {
    document.getElementById('popupFormCategoria').classList.remove('hidden')
  }
}

function cerrarPopup () {
  document.getElementById('popupForm').classList.add('hidden')
}

function cerrarPopupCategoria () {
  document.getElementById('popupFormCategoria').classList.add('hidden')
}

function cerrarPopupAuth () {
  document.getElementById('popupAuth').classList.add('hidden')
}

function agregarElemento () {
  if (!selectedItem) {
    Swal.fire('Error', 'No se ha seleccionado ningún elemento.', 'error')
    return
  }

  const item = {
    id: crypto.randomUUID(),
    nombre: selectedItem.label,
    tipo: document.getElementById('tipo').value,
    episodios: document.getElementById('episodios').value || 'N/A',
    categoria: document.getElementById('categoria').value,
    completado: document.getElementById('completado').checked ? 'Sí' : 'No',
    img: selectedItem.img,
    anio: selectedItem.anio
  }

  app.agregarElemento(item, 'item').then(() => {
    data.items.push(item)
    saveToLocalStorage()
    agregarItemLista(item)
    resetInputsItem()
    cerrarPopup()
  })
}

function guardarEdicion () {
  const item = {
    id: app.itemEditadoId,
    nombre: document.getElementById('nombre').value,
    tipo: document.getElementById('tipo').value,
    episodios: document.getElementById('episodios').value || 'N/A',
    categoria: document.getElementById('categoria').value,
    completado: document.getElementById('completado').checked ? 'Sí' : 'No'
  }

  app.editarElemento(item).then(() => {
    const index = data.items.findIndex(i => i.id === item.id)
    if (index !== -1) {
      data.items[index] = item
      saveToLocalStorage()
      actualizarLista()
      cerrarPopup()
    }
  })
}

function mostrarPopupAuth (tipo) {
  document.getElementById('popupAuth').classList.remove('hidden')
  if (tipo === 'login') {
    document.getElementById('authTitle').innerText = 'Iniciar Sesión'
    document.getElementById('authAction').innerText = 'Ingresar'
    document.getElementById('authAction').onclick = () => {
      const email = document.getElementById('authEmail').value
      const password = document.getElementById('authPassword').value
      app.iniciarSesion(email, password).then(() => cerrarPopupAuth())
    }
  } else if (tipo === 'register') {
    document.getElementById('authTitle').innerText = 'Registrarse'
    document.getElementById('authAction').innerText = 'Registrar'
    document.getElementById('authAction').onclick = () => {
      const email = document.getElementById('authEmail').value
      const password = document.getElementById('authPassword').value
      app.registrarUsuario(email, password).then(() => cerrarPopupAuth())
    }
  }
}

function agregarCategoria () {
  // TODO:revisando
  const categoria = {
    id: crypto.randomUUID(),
    nombre: document.getElementById('nuevaCategoria').value
  }
  data.categoria.push(categoria)
  agregarElemento(categoria, 'categoria')
  saveToLocalStorage()
  cargaCategoriasSelect()
  // agregarCategoriaElemento(categoria)
  document.getElementById('nuevaCategoria').value = ''
  cerrarPopupCategoria()
}

function actualizarLista () {
  const list = document.getElementById('list')
  list.innerHTML = ''
  data.items.forEach((item) => agregarItemLista(item))
}

function agregarItemLista (item) {
  if (!item) return
  const card = document.createElement('div')
  card.classList.add('card')
  card.setAttribute('data-id', item.id)

  const title = document.createElement('h3')
  title.textContent = item.nombre

  const details = document.createElement('p')
  const categoria = data.categoria.find(categoria => categoria.id === item.categoria)?.nombre
  details.innerHTML = `
    Tipo: ${item.tipo}<br>
    Episodios: ${item.episodios}<br>
    Finalizado: ${item.completado}<br>
    Categoría: ${categoria || 'Sin categoría'}
  `

  const editButton = document.createElement('button')
  editButton.textContent = 'Editar'
  editButton.classList.add('edit-button')
  editButton.addEventListener('click', () => editarElemento(item.id))

  const deleteButton = document.createElement('button')
  deleteButton.classList.add('delete-button')
  deleteButton.addEventListener('click', () => {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo!'
    }).then((result) => {
      if (result.isConfirmed) {
        card.remove()
        removeFromLocalStorage(item.id)
        Swal.fire('¡Eliminado!', 'El elemento ha sido eliminado.', 'success')
      }
    })
  })

  card.appendChild(title)
  card.appendChild(details)
  card.appendChild(editButton)
  card.appendChild(deleteButton)
  document.getElementById('list').appendChild(card)
}

function removeFromLocalStorage (id) {
  data.items = data.items.filter((item) => item.id !== id)
  saveToLocalStorage()
}

function saveToLocalStorage () {
  localStorage.setItem('data', JSON.stringify(data))
}

function loadFromLocalStorage () {
  if (localStorage.getItem('data')) {
    data = JSON.parse(localStorage.getItem('data'))
    data.items.forEach((item) => agregarItemLista(item))
  }
}

function cargaTipoSelect () {
  const select = document.getElementById('tipo')
  select.innerHTML = ''
  const tipos = ['Pelicula', 'Serie', 'Anime', 'Documental', 'Podcast', 'Otro']

  const option = document.createElement('option')
  option.value = ''
  option.text = 'Seleccionar Tipo'
  select.appendChild(option)

  tipos.forEach(tipo => {
    const option = document.createElement('option')
    option.value = tipo
    option.text = tipo
    select.appendChild(option)
  })
}

function cargaCategoriasSelect () {
  const select = document.getElementById('categoria')
  select.innerHTML = ''

  const option = document.createElement('option')
  option.value = ''
  option.text = 'Seleccionar Categoría'
  select.appendChild(option)

  data.categoria.forEach((categoria) => {
    const option = document.createElement('option')
    option.value = categoria.id
    option.text = categoria.nombre
    select.appendChild(option)
  })
}

function cargaNombreSelect () {
  const $nombre = document.getElementById('nombre')
  const $nombreElm = document.getElementById('nombreElm')

  $nombreElm.style.display = 'none' // Inicialmente ocultar el contenedor de resultados

  $nombre.addEventListener('input', function () {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      buscarAgregarOpciones($nombre.value)
    }, 500)
  })

  $nombreElm.addEventListener('click', function (event) {
    const clickedElement = event.target.closest('.autocomplete-item')
    if (clickedElement) {
      selectedItem = {
        id: clickedElement.dataset.id,
        label: clickedElement.dataset.label,
        img: clickedElement.dataset.img,
        anio: clickedElement.dataset.anio
      }
      $nombre.value = selectedItem.label
      $nombreElm.style.display = 'none' // Ocultar el contenedor de resultados después de la selección
    }
  })
}

async function buscarAgregarOpciones (query) {
  const $nombreElm = document.getElementById('nombreElm')
  $nombreElm.innerHTML = '' // Clear previous suggestions

  if (!query) {
    $nombreElm.style.display = 'none'
    return
  }
  if (!query) return

  const url = `https://imdb8.p.rapidapi.com/auto-complete?q=${query}`
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiConfig.API_RAPID,
      'x-rapidapi-host': rapidApiConfig.API_HOST
    }
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    const elementos = data.d.map(item => ({
      id: item.id,
      label: item.l,
      img: item.i?.imageUrl || '',
      anio: item.y || ''
    }))

    if (elementos.length > 0) {
      elementos.forEach(elemento => {
        const div = document.createElement('div')
        div.classList.add('autocomplete-item')
        div.dataset.id = elemento.id
        div.dataset.label = elemento.label
        div.dataset.img = elemento.img
        div.dataset.anio = elemento.anio
        div.innerHTML = `
          ${elemento.img ? `<img src="${elemento.img}" alt="${elemento.label}" style="height: 50px; margin-right: 10px;">` : ''}
          <span>${elemento.label}</span> - <span>${elemento.anio}</span>
        `
        $nombreElm.appendChild(div)
      })
      $nombreElm.style.display = 'block' // Mostrar el contenedor de resultados si hay elementos
    } else {
      $nombreElm.style.display = 'none' // Ocultar el contenedor de resultados si no hay elementos
    }
  } catch (error) {
    console.error('Error al buscar opciones:', error)
    Swal.fire('Error', 'Error al buscar opciones: ' + error.message, 'error')
  }
}

function resetInputsItem () {
  document.getElementById('nombre').value = ''
  document.getElementById('tipo').value = ''
  document.getElementById('episodios').value = ''
  document.getElementById('categoria').value = ''
  document.getElementById('completado').checked = false
  selectedItem = null // Reset selected item
}

function ordenarCategoria () {
  const $ordCategoria = document.getElementById('ordCategoria')
  // verificar si caregoria contiene la clases is-active

  if ($ordCategoria.classList.contains('is-active')) {
    $ordCategoria.classList.remove('is-active')
    app.cargarColecciones()
    return
  } else {
    $ordCategoria.classList.add('is-active')
  }

  const $elemList = document.getElementById('list')
  $elemList.innerHTML = ''
  for (const x of data.categoria) {
    const div = document.createElement('div')
    div.classList.add('catDiv')
    // añadimos el nombre de la categoria
    const h2 = document.createElement('h2')
    h2.textContent = x.nombre
    div.appendChild(h2)
    // añadimos div que contendra los elementos de la categoria
    const divElem = document.createElement('div')
    divElem.classList.add('catElem')
    div.appendChild(divElem)
    // añadimos los elementos de la categoria
    for (const y of data.items) {
      if (y.categoria === x.id) {
        const card = document.createElement('div')
        card.classList.add('card')
        card.setAttribute('data-id', y.id)
        const title = document.createElement('h3')
        title.textContent = y.nombre
        const details = document.createElement('p')
        details.innerHTML = `
          Tipo: ${y.tipo}<br>
          Episodios: ${y.episodios}<br>
          Finalizado: ${y.completado}<br>
        `
        const editButton = document.createElement('button')
        editButton.textContent = 'Editar'
        editButton.classList.add('edit-button')
        editButton.addEventListener('click', () => editarElemento(y.id))
        const deleteButton = document.createElement('button')
        deleteButton.classList.add('delete-button')
        deleteButton.addEventListener('click', () => {
          Swal.fire({
            title: '¿Está seguro?',
            text: '¡No podrás revertir esto!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminarlo!'
          }).then((result) => {
            if (result.isConfirmed) {
              card.remove()
              removeFromLocalStorage(y.id)
              Swal.fire('¡Eliminado!', 'El elemento ha sido eliminado.', 'success')
            }
          })
        }
        )
        card.appendChild(title)
        card.appendChild(details)
        card.appendChild(editButton)
        card.appendChild(deleteButton)
        divElem.appendChild(card)
      }

      $elemList.appendChild(div)
    }
  }
}

window.mostrarPopupAuth = mostrarPopupAuth
window.cerrarPopupAuth = cerrarPopupAuth
window.agregarElemento = agregarElemento
window.buscarElemento = () => { /* Implement search functionality */ }
window.ordenarPorCategoria = ordenarCategoria
window.abrirPopup = abrirPopup
window.cerrarPopup = cerrarPopup
window.cerrarPopupCategoria = cerrarPopupCategoria
window.agregarCategoria = agregarCategoria
window.guardarEdicion = guardarEdicion
window.cerrarSesion = () => app.cerrarSesion()
