var data = { categoria: [], items: [] };
var utils = { tipo: ['Pelicula', 'Serie', 'Anime', 'Documental', 'Podcast', 'Otro'] };
var itemEditadoId = null;

document.addEventListener('DOMContentLoaded', function () {
    loadFromLocalStorage();
});

function abrirPopup(tipo) {
    if (tipo === 'item') {
        document.getElementById('popupForm').classList.remove('hidden');
        document.getElementById('agregarItem').classList.remove('hidden');
        document.getElementById('editarItem').classList.add('hidden');
        cargaTipoSelect();
        cargaCategoriasSelect();
    } else if (tipo === 'categoria') {
        document.getElementById('popupFormCategoria').classList.remove('hidden');
    }
}

function cerrarPopup() {
    document.getElementById('popupForm').classList.add('hidden');
}

function cerrarPopupCategoria() {
    document.getElementById('popupFormCategoria').classList.add('hidden');
}

function agregarElemento() {
    let $nombre = document.getElementById('nombre');
    let $tipo = document.getElementById('tipo');
    let $episodios = document.getElementById('episodios');
    let $categoria = document.getElementById('categoria');
    let $completado = document.getElementById('completado');

    if (!$nombre.value || !$tipo.value || !$categoria.value) {
        alert('Por favor, completa todos los campos');
        return;
    }

    if ($categoria.value === 'new') {
        alert('Ingrese nueva categoría:');
        return;
    }

    let item = {
        id: crypto.randomUUID(),
        nombre: $nombre.value,
        tipo: $tipo.value,
        episodios: $episodios.value || 'N/A',
        categoria: $categoria.value,
        completado: $completado.checked ? 'Sí' : 'No'
    };

    data.items.push(item);
    agregarItemLista(item);
    saveToLocalStorage();
    resetInputsItem();
    cerrarPopup();
}

function resetInputsItem() {
    document.getElementById('nombre').value = '';
    document.getElementById('tipo').value = '';
    document.getElementById('episodios').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('completado').checked = false;
}

function editarElemento(id) {
    resetInputsItem();

    itemEditadoId = id;

    let item = data.items.find(item => item.id === id);

    document.getElementById('nombre').value = item.nombre;
    document.getElementById('tipo').value = item.tipo;
    document.getElementById('episodios').value = item.episodios;
    document.getElementById('categoria').value = item.categoria;
    document.getElementById('completado').checked = item.completado === 'Sí';

    document.getElementById('popupForm').classList.remove('hidden');
    document.getElementById('agregarItem').classList.add('hidden');
    document.getElementById('editarItem').classList.remove('hidden');
}

function guardarEdicion() {
    let $nombre = document.getElementById('nombre');
    let $tipo = document.getElementById('tipo');
    let $episodios = document.getElementById('episodios');
    let $categoria = document.getElementById('categoria');
    let $completado = document.getElementById('completado');

    if (!$nombre.value || !$tipo.value || !$categoria.value) {
        alert('Por favor, completa todos los campos');
        return;
    }

    let item = {
        id: itemEditadoId,
        nombre: $nombre.value,
        tipo: $tipo.value,
        episodios: $episodios.value || 'N/A',
        categoria: $categoria.value,
        completado: $completado.checked ? 'Sí' : 'No'
    }

    let index = data.items.findIndex(item => item.id === itemEditadoId);
    data.items[index] = item;

    saveToLocalStorage();
    actualizarLista();
    cerrarPopup();
}

function agregarCategoria() {
    let $nuevaCategoria = document.getElementById('nuevaCategoria').value;

    if (!$nuevaCategoria) {
        alert('Por favor, ingresa un nombre para la categoría');
        return;
    }

    if (data.categoria.some(categoria => categoria.nombre === $nuevaCategoria)) {
        alert('La categoría ya existe');
        return;
    }

    let categoria = {
        id: crypto.randomUUID(),
        nombre: $nuevaCategoria
    }

    data.categoria.push(categoria);

    // añadimos la nueva categoría al actual select
    cargaCategoriasSelect();

    saveToLocalStorage();
    document.getElementById('nuevaCategoria').value = '';
    cerrarPopupCategoria();
}

function cargaCategoriasSelect() {
    let select = document.getElementById('categoria');
    select.innerHTML = '';

    let option = document.createElement('option');
    option.value = '';
    option.text = 'Seleccionar Categoría';
    select.appendChild(option);

    let newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.text = 'Agregar Nueva Categoria';
    select.appendChild(newOption);

    data.categoria.forEach(categoria => {
        let option = document.createElement('option');
        option.value = categoria.id;
        option.text = categoria.nombre;
        select.appendChild(option);
    });
}

function agregarItemLista(item) {
    let card = document.createElement('div');
    card.classList.add('card');
    card.setAttribute('data-id', item.id);

    let title = document.createElement('h3');
    title.textContent = item.nombre;

    let details = document.createElement('p');
    details.innerHTML = `
        Tipo: ${item.tipo}<br>
        Episodios: ${item.episodios}<br>
        Finalizado: ${item.completado}<br>
        Categoría: ${data.categoria.find(categoria => categoria.id === item.categoria).nombre}
    `;

    let editButton = document.createElement('button');
    editButton.textContent = 'Editar';
    editButton.classList.add('edit-button');
    editButton.addEventListener('click', function () {
        editarElemento(item.id);
    });

    let deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', function () {
        if (confirm('¿Está seguro de que desea eliminar este elemento?')) {
            card.remove();
            removeFromLocalStorage(item.id);
        }
    });

    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(editButton);
    card.appendChild(deleteButton);
    document.getElementById('list').appendChild(card);
}

function agregarCategoriaElemento(categoria) {
    let li = document.createElement('li');
    li.textContent = categoria.nombre;
    li.setAttribute('data-id', categoria.id);

    let deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', function () {
        if (confirm('¿Está seguro de que desea eliminar esta categoría?')) {
            li.remove();
            removeCategoriaFromLocalStorage(categoria.id);
        }
    });

    li.appendChild(deleteButton);
    document.getElementById('categoriaList').appendChild(li);
}

function saveToLocalStorage() {
    localStorage.setItem('data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    if (localStorage.getItem('data')) {
        data = JSON.parse(localStorage.getItem('data'));
        data.items.forEach(item => agregarItemLista(item));
        data.categoria.forEach(categoria => agregarCategoriaElemento(categoria));
    }
}

function removeFromLocalStorage(id) {
    data.items = data.items.filter(item => item.id !== id);
    saveToLocalStorage();
}

function removeCategoriaFromLocalStorage(id) {
    data.categoria = data.categoria.filter(categoria => categoria.id !== id);
    saveToLocalStorage();
}

function cargaTipoSelect() {
    let select = document.getElementById('tipo');
    select.innerHTML = '';
    let tipos = utils.tipo;

    let option = document.createElement('option');
    option.value = '';
    option.text = 'Seleccionar Tipo';
    select.appendChild(option);

    for (const tipo of tipos) {
        let option = document.createElement('option');
        option.value = tipo;
        option.text = tipo;
        select.appendChild(option);
    }
}

function buscarElemento() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let items = document.querySelectorAll('.card');

    items.forEach(item => {
        let nombre = item.querySelector('h3').textContent.toLowerCase();
        if (nombre.includes(input)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function ordenarPorCategoria() {
    data.items.sort((a, b) => {
        let categoriaA = data.categoria.find(categoria => categoria.id === a.categoria).nombre.toLowerCase();
        let categoriaB = data.categoria.find(categoria => categoria.id === b.categoria).nombre.toLowerCase();
        return categoriaA.localeCompare(categoriaB);
    });
    actualizarLista();
}

function actualizarLista() {
    let list = document.getElementById('list');
    list.innerHTML = '';
    data.items.forEach(item => agregarItemLista(item));
}
