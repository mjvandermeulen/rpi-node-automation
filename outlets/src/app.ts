import * as Koa from 'koa'
import * as json from 'koa-json' // TODO remove
import * as KoaRouter from 'koa-router'
import * as path from 'path'
import * as renderEJS from 'koa-ejs' // NOTE: RENDER
import * as serveStatic from 'koa-static'
import * as bodyParser from 'koa-bodyparser'

interface Group {
  displayName: string
  addTimer: boolean
  defaultTimer: number
}

const port: number = 3000

const app = new Koa()
const router = new KoaRouter()

const livingroom: Group = {
  displayName: 'Living Room',
  addTimer: false,
  defaultTimer: 0,
}
const officelight: Group = {
  displayName: 'Office Light',
  addTimer: true,
  defaultTimer: 0,
}
const coffee: Group = {
  displayName: 'Coffee',
  addTimer: true,
  defaultTimer: 0,
}
const fan: Group = {
  displayName: 'Office Fan',
  addTimer: true,
  defaultTimer: 0,
}
const guestlight: Group = {
  displayName: 'Guest Light',
  addTimer: true,
  defaultTimer: 0,
}
const guestnightlight: Group = {
  displayName: 'Guest Night Light',
  addTimer: false,
  defaultTimer: 0,
}

const groups = {
  // livingroom,
  officelight,
  // fan,
  coffee,
  // guestlight,
  // guestnightlight,
}

// Json Prettier Middleware
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
// Index
router.get('/', index)

// list of things
async function index(ctx: any) {
  await ctx.render('index', {
    title: 'Remote Outlets',
    groups,
  })
}

// Router Middleware
app.use(router.routes()).use(router.allowedMethods())

app.listen(port, () => console.log(`server started on port: ${port}`))

process.on('SIGINT', function() {
  // LED.writeSync(0)
  // LED.unexport()
  // pushButton.unexport()
  process.exit()
})
