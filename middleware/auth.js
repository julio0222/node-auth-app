// middleware/auth.js

function ensureAuth(req, res, next) {
  if (req.session && req.session.user) {
    // Usuario autenticado: puede seguir
    return next();
  }

  // Si no está logueado, lo mandamos al login con un mensajito
  req.flash('error', 'Debes iniciar sesión para acceder a esta sección.');
  return res.redirect('/login');
}

module.exports = { ensureAuth };
