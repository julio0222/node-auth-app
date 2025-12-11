const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Sequelize = require('sequelize');

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register',
  body('fullname').notEmpty().withMessage('fullname requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join(', '));
      return res.redirect('/register');
    }

    try {
      const sequelize = req.app.get('sequelize');
      const User = require('../models/user')(sequelize);
      const { fullname, email, password } = req.body;

      const exists = await User.findOne({ where: { email }});
      if (exists) {
        req.flash('error', 'El email ya está registrado');
        return res.redirect('/register');
      }

      await User.create({ fullname, email, password });
      req.flash('success', 'Registro correcto. Inicia sesión.');
      res.redirect('/login');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error interno');
      res.redirect('/register');
    }
  }
);

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', 'Credenciales inválidas');
      return res.redirect('/login');
    }

    try {
      const sequelize = req.app.get('sequelize');
      const User = require('../models/user')(sequelize);
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email }});
      if (!user) {
        req.flash('error', 'Usuario no encontrado');
        return res.redirect('/login');
      }

      const valid = await user.validPassword(password);
      if (!valid) {
        req.flash('error', 'Contraseña incorrecta');
        return res.redirect('/login');
      }

      // update last login
      user.lastLogin = new Date();
      await user.save();

      req.session.user = { id: user.id, fullname: user.fullname, email: user.email };
      req.flash('success', 'Bienvenido ' + user.fullname);
      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error interno');
      res.redirect('/login');
    }
  }
);

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
