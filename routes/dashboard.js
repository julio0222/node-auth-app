const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Debes iniciar sesión');
  res.redirect('/login');
}

router.get('/dashboard', ensureAuth, async (req, res) => {
  // Show basic info
  res.render('dashboard', { user: req.session.user });
});

router.get('/profile', ensureAuth, async (req, res) => {
  const sequelize = req.app.get('sequelize');
  const User = require('../models/user')(sequelize);
  const user = await User.findByPk(req.session.user.id);
  res.render('profile', { user });
});

router.get('/profile/edit', ensureAuth, async (req, res) => {
  const sequelize = req.app.get('sequelize');
  const User = require('../models/user')(sequelize);
  const user = await User.findByPk(req.session.user.id);
  res.render('edit_profile', { user });
});

router.post('/profile/edit', ensureAuth,
  body('fullname').notEmpty().withMessage('fullname requerido'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join(', '));
      return res.redirect('/profile/edit');
    }
    const sequelize = req.app.get('sequelize');
    const User = require('../models/user')(sequelize);
    const user = await User.findByPk(req.session.user.id);
    user.fullname = req.body.fullname;
    await user.save();
    // update session
    req.session.user.fullname = user.fullname;
    req.flash('success', 'Perfil actualizado');
    res.redirect('/profile');
  }
);

module.exports = router;
