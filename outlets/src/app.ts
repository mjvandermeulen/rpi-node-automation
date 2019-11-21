import * as Koa from 'koa'
import * as http from 'http'
import * as json from 'koa-json' // TODO remove
import * as KoaRouter from 'koa-router'
import * as path from 'path'
import * as renderEJS from 'koa-ejs'
import * as serveStatic from 'koa-static'
import * as bodyParser from 'koa-bodyparser'

import { Outlets } from './Outlets'
import { groupsSettings } from './group-settings'
import { initPhysicalButton } from './physical-button'

// app/server initialization
const port: number = 3000
const app = new Koa()
const server = http.createServer(app.callback())
// const io = require('socket.io')(server)
const router = new KoaRouter()

// Outlets and physical pushbutton init
const outlets = new Outlets(server, 'light', groupsSettings)
initPhysicalButton(outlets, 'officelight')

// Json Prettier Middleware (not needed when working with Chrome)
// I can't tell the difference....
app.use(json())

// Hello World JSON
// app.use(async (ctx: any) => {
//   ctx.body = { apiMessage: 'Hello', apiMessage2: 'World' }
// })

app.use(serveStatic('./src/assets'))

app.use(bodyParser())
renderEJS(app, {
  root: path.join(__dirname, 'views'),
  layout: 'layout',
  viewExt: 'html',
  cache: false,
  debug: false,
})

// Routes
//   Index
router.get('/', index)
//   Data API
router.get('/data/groups', serveGroups)
// router.post('/', serveGroups)

// list of things
async function index(ctx: any) {
  await ctx.render('index', {
    title: 'Remote Outlets',
    groupsSettings,
  })
}

async function serveGroups(ctx: any) {
  // data: array of the groupSettings keys. e.g.: ['livingroom', 'officelight']
  const data = Object.keys(groupsSettings)
  ctx.body = JSON.stringify(data)
}

// Router Middleware
app.use(router.routes()).use(router.allowedMethods())
server.listen(port, () => console.log(`server started on port: ${port}`))

process.on('SIGINT', function() {
  // LED.writeSync(0)
  // LED.unexport()
  // pushButton.unexport()
  process.exit()
})
