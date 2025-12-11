// small client-side validation examples
document.addEventListener('DOMContentLoaded', function () {
  const register = document.querySelector('form[action="/register"]');
  if (register) {
    register.addEventListener('submit', function (e) {
      const pw = document.getElementById('password').value || '';
      if (pw.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        e.preventDefault();
      }
    });
  }
});
