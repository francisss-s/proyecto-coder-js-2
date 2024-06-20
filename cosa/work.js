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
    
  // Función para convertir fechas
  function convertirFecha(valor, valorPorDefecto) {
    if (!isNaN(valor)) {
      const fechaExcel = new Date(
        (valor - (valor >= 60 ? 25569 : 25568)) * 86400 * 1000
      );
      let day = `${(fechaExcel.getDate())}`.padStart(2,'0');
      let month = `${(fechaExcel.getMonth() + 1)}`.padStart(2,'0');
      let year = fechaExcel.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    const regexFecha = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (regexFecha.test(valor)) {
      const partes = valor.split("-");
      const dia = partes[0];
      const mes = partes[1] - 1;
      const año = partes[2];
      const fecha = new Date(año, mes, dia);
      let day = `${(fecha.getDate())}`.padStart(2,'0');
      let month = `${(fecha.getMonth() + 1)}`.padStart(2,'0');
      let year = fecha.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    return valorPorDefecto.toString();
  }
    
  function verificarString(valor, valorPorDefecto) {
    return valor === undefined || valor === null || valor === ""
      ? valorPorDefecto.toString()
      : valor.toString();
  }
    
  // Función para verificar y limpiar valores number
  function verificarNumber(valor, valorPorDefecto) {
    return isNaN(Number(valor)) || valor === undefined || valor === null || valor === ""
      ? valorPorDefecto.toString()
      : Number(valor).toString();
  }
    