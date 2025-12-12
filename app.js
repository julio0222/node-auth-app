const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const path = require('path');
const { Sequelize } = require('sequelize');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const expressLayouts = require('express-ejs-layouts');
const { ensureAuth } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // secure true requires https
}));
app.use(flash());

// Make flash & user available to views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Initialize DB (Sequelize + SQLite)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});
app.set('sequelize', sequelize);

// Import models (✅ SOLO UNA VEZ)
const User = require('./models/user')(sequelize);

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);

// Home
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

app.get('/game', ensureAuth, (req, res) => {
  res.render('game', { user: req.session.user || null });
});

// ✅ Sync DB -> crear admin -> levantar servidor
sequelize.sync()
  .then(async () => {
    console.log('DB synced');

    // 🔐 Crear usuario admin por defecto si no existe
    const adminEmail = 'admin@example.com';

    const adminExists = await User.findOne({
      where: { email: adminEmail }
    });

    if (!adminExists) {
      await User.create({
        fullname: 'Administrador',
        email: adminEmail,
        password: 'password123', // si tu modelo tiene bcrypt hook, se hashea solo
      });
      console.log('✅ Usuario admin creado por defecto');
    } else {
      console.log('ℹ️ Usuario admin ya existe');
    }

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  })
  .catch(err => console.error(err));
