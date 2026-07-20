
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react-body-highlighter.cjs.production.min.js')
} else {
  module.exports = require('./react-body-highlighter.cjs.development.js')
}
