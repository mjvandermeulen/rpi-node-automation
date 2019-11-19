import * as Koa from 'koa'
import * as json from 'koa-json' // TODO remove
import * as KoaRouter from 'koa-router'
import * as path from 'path'
import * as renderEJS from 'koa-ejs'
import * as serveStatic from 'koa-static'
import * as bodyParser from 'koa-bodyparser'
import { GroupsSettings } from './Outlets'

const port: number = 3000

const app = new Koa()
const router = new KoaRouter()

// LEARN **** try to add bogus keys
const groupsSettings: GroupsSettings = {
  // bogus: {
  //   displayName: 'Bogus',
  //   defaultTimer: 12,
  //   bogus: 'app',
  // },

  // livingroom: {
  //   displayName: 'Living Room',
  //   defaultTimer: 0,
  // },
  officelight: {
    displayName: 'Office Light',
    defaultTimer: 0,
  },
  coffee: {
    displayName: 'Coffee',
    defaultTimer: 45 * 60 * 1000,
  },
  // fan: {
  //   displayName: 'Office Fan',
  //   defaultTimer: 0,
  // },
  // guestlight: {
  //   displayName: 'Guest Light',
  //   defaultTimer: 0,
  // },
  // guestnightlight: {
  //   displayName: 'Guest Night Light',
  //   defaultTimer: 0,
  // },
}

const groups: string[] = Object.keys(groupsSettings)

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
  ctx.body = JSON.stringify(groups)
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
