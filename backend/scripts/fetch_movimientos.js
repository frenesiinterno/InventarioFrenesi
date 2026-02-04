(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/inventario/movimientos');
    const text = await res.text();
    console.log('status', res.status);
    console.log('body', text);
  } catch (err) {
    console.error('ERR', err.message);
  }
})();