// preflight desligado para o Tailwind não conflitar com o reset do Material-UI (CssBaseline)
module.exports = { content: ['./pages/**/*.js', './components/**/*.js'], corePlugins: { preflight: false }, theme: { extend: {} }, plugins: [] };
