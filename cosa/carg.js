// cargador.js

// Función para leer y convertir los datos de Excel a JSON
function leerDatosExcel(archivo, header = 1, salto = 0) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = (e) => {
        try {
          const datos = new Uint8Array(e.target.result);
          const workbook = XLSX.read(datos, { type: "array" });
  
          const hoja = workbook.Sheets[workbook.SheetNames[0]];
  
          const jsonFormulario = XLSX.utils.sheet_to_json(hoja, { header: header }).slice(salto);
  
          // Limpiar filas vacías
          const datosLimpios = limpiarFilasVacias(jsonFormulario);
  
          resolve(datosLimpios);
        } catch (error) {
          reject(`Error al leer el archivo: ${error.message}`);
        }
      };
      lector.onerror = () => reject("Error al leer el archivo");
      lector.readAsArrayBuffer(archivo);
    });
  }
  
  // Función para limpiar las filas vacías del archivo
  function limpiarFilasVacias(datos) {
    return datos.filter(fila =>
      Object.values(fila).some(valor => valor !== undefined && valor !== "")
    );
  }
  
  // Función para crear un Web Worker
  function crearTrabajador() {
    const codigoTrabajador = `
        self.onmessage = function (e) {
            if (e.data.action === "procesar") {
                const { datos, contrato } = e.data;
                const datosLimpios = limpiarVerificarDatos(datos, contrato);
                self.postMessage({ action: "procesado", datos: datosLimpios });
            }
        };

        function limpiarVerificarDatos(datos, contrato) {
            return datos.map((fila) => {
                return contrato.map((columna) => {
                    let valor;
                    if (fila[columna.nombre] !== undefined) {
                        valor = fila[columna.nombre];
                    } else if (fila[columna.ind] !== undefined) {
                        valor = fila[columna.ind];
                    } else {
                        return columna.valorPorDefecto.toString();
                    }

                    // Verificación del tipo de datos y valores por defecto
                    switch (columna.tipo) {
                        case "string":
                            return verificarString(valor, columna.valorPorDefecto);
                        case "number":
                            return verificarNumber(valor, columna.valorPorDefecto);
                        case "date":
                            return convertirFecha(valor, columna.valorPorDefecto);
                        default:
                            return columna.valorPorDefecto.toString();
                    }
                });
            });
        }

        function convertirFecha(valor, valorPorDefecto) {
            if (!isNaN(valor)) {
                const fechaExcel = new Date(
                    (valor - (valor >= 60 ? 25569 : 25568)) * 86400 * 1000
                );
                let day = \`\${(fechaExcel.getDate())}\`.padStart(2, '0');
                let month = \`\${(fechaExcel.getMonth() + 1)}\`.padStart(2, '0');
                let year = fechaExcel.getFullYear();
                return \`\${day}-\${month}-\${year}\`;
            }

            const regexFecha = /^(\d{2})-(\d{2})-(\d{4})$/;
            if (regexFecha.test(valor)) {
                const partes = valor.split("-");
                const dia = partes[0];
                const mes = partes[1] - 1;
                const año = partes[2];
                const fecha = new Date(año, mes, dia);
                let day = \`\${(fecha.getDate())}\`.padStart(2, '0');
                let month = \`\${(fecha.getMonth() + 1)}\`.padStart(2, '0');
                let year = fecha.getFullYear();
                return \`\${day}-\${month}-\${year}\`;
            }

            return valorPorDefecto.toString();
        }

        function verificarString(valor, valorPorDefecto) {
            return valor === undefined || valor === null || valor === ""
                ? valorPorDefecto.toString()
                : valor.toString();
        }

        function verificarNumber(valor, valorPorDefecto) {
            return isNaN(Number(valor)) || valor === undefined || valor === null || valor === ""
                ? valorPorDefecto.toString()
                : Number(valor).toString();
        }
    `;

    const blob = new Blob([codigoTrabajador], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
}
  
  // Función para limpiar los datos utilizando un Web Worker
  function limpiarDatosConWorker(datos, contrato) {
    return new Promise((resolve, reject) => {
      const trabajador = crearTrabajador();
      trabajador.postMessage({ action: "procesar", datos, contrato });
  
      trabajador.onmessage = (e) => {
        if (e.data.action === "procesado") {
          resolve(e.data.datos);
        } else {
          reject("Error al limpiar y validar la parte");
        }
      };
    });
  }
  
  // eslint-disable-next-line no-unused-vars
  async function inicializarProcesoCarga(nombreArchivo, idEmpresa, usuario, tipoCarga) {
    const params = {
      cabecera: { codigo: "cargas.inicializar.carga", version: "1.0.0" },
      cuerpo: {
        nom_archivo: nombreArchivo,
        nom_archivo_sistema: nombreArchivo,
        id_empresa: idEmpresa,
        usuario: usuario,
        tipo_carga: tipoCarga.toString()
      },
      emisor: { id_empresario: idEmpresa, id_usuario: usuario }
    };
  
    const config = {
      url: localStorage.API_FACTORY,
      method: "POST",
      body: params
    };
  
    try {
      const { response } = await tx.request(config);
      return response.resp.id_proceso;
    } catch (error) {
      console.error(error);
      return -1;
    }
  }
  
  // eslint-disable-next-line no-unused-vars
  async function finalizarProcesoCarga(idEmpresa, usuario, idProceso, tipoCarga) {
    const params = {
      cabecera: { codigo: "cargas.finalizar.carga", version: "1.0.0" },
      cuerpo: {
        id_empresa: idEmpresa,
        id_proceso: idProceso.toString(),
        tipo_carga: tipoCarga.toString()
      },
      emisor: { id_empresario: idEmpresa, id_usuario: usuario }
    };
  
    const config = {
      url: localStorage.API_FACTORY,
      method: "POST",
      body: params
    };
  
    try {
      const { response } = await tx.request(config);
      funcionesPhoenix.mostrarMensaje(response.msg, response.status);
    } catch (error) {
      console.error(error);
    }
  }
  
  // eslint-disable-next-line no-unused-vars
  function actualizarContratoConColumnasDinamicas(datos, contrato) {
    if (datos.length === 0) return contrato;
  
    const keys = Object.keys(datos[0]);
  
    // Actualizar el contrato con los nombres dinámicos encontrados en las keys
    contrato.forEach(columna => {
      if (columna.patron) {
        const keyEncontrada = keys.find(key => columna.patron.test(key));
        if (keyEncontrada) {
          columna.nombre = keyEncontrada;
        }
      }
    });
  
    return contrato;
  }
  
  async function cargarDatos(idEmpresa, tipoCarga, fechaInicio, fechaFin) {
    // console.log(idEmpresa, tipoCarga, fechaInicio, fechaFin)
    const params = {
      id_empresa: idEmpresa,
      tipo_carga: tipoCarga,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    };
    const config = {
      url: `${localStorage.API_FACTORY}/cargas.obtener/2.0.1`,
      method: "GET",
      params: params
    };
    try {
      const { response } = await tx.request(config);
      const resp = response.resp;
      return resp;
    } catch (error) {
      console.error(error);
    }
  }