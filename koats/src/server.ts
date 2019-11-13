import * as Koa from 'koa'
import * as json from 'koa-json'
import * as KoaRouter from 'koa-router'
import * as path from 'path'
import * as render from 'koa-ejs' // NOTE: RENDER
import * as bodyParser from 'koa-bodyparser'

const port: number = 3000

const app = new Koa()
const router = new KoaRouter()

// replace with DB connection:
const things = ['My Family', 'Programming', 'Music']

// Json Prettier Middleware
app.use(json())

// Hello Worlds JSON
// app.use(async (ctx: any) => {
//   ctx.body = { apiMessage: 'Hello', apiMessage2: 'World' }
// })
app.use(bodyParser())
render(app, {
  root: path.join(__dirname, 'views'),
  layout: 'layout',
  viewExt: 'html',
  cache: false,
  debug: false,
})

app.context.user = 'Maarten Jan'

// Routes
// Index
router.get('/', index)
router.get('/add', showAdd)
router.post('/add', add)

// list of things
async function index(ctx: any) {
  // await ctx.render('index2', {
  await ctx.render('index', {
    title: 'Things',
    things,
  })
}

// show add page
async function showAdd(ctx: any) {
  // await ctx.render('index2', {
  await ctx.render('add')
}

// Add thing

async function add(ctx: any) {
  const body = ctx.request.body
  things.push(body.thing)
  ctx.redirect('/')
}
// show add page

router.get('/test', (ctx: any) => (ctx.body = `Hello ${ctx.user}`))
router.get(
  '/testname/:name',
  (ctx: any) => (ctx.body = `Hello ${ctx.user}, meet ${ctx.params.name}`)
)

// Router Middleware
app.use(router.routes()).use(router.allowedMethods())

app.listen(port, () => console.log(`server started on port: ${port}`))
