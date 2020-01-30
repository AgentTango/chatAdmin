const Telegraf = require('telegraf')
const mongo = require('mongodb').MongoClient
const data = require('./data')
const text = require('./text')
const functions = require('./functions')
const bot = new Telegraf(data.token)
const { telegram } = bot
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

mongo.connect(data.mongoLink, { useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.log(err)
  }

  bot.context.db = client.db('chatAdmin')
  bot.startPolling()
})


bot.hears(/^!ban [0-9]{0,3}[mhdw]{0,1}$/i, async (ctx) => {
  if (await functions.checkConds(ctx)) {
    return
  }

  const date = ctx.message.text.length > 5 ? functions.getDate(ctx.message.text.substr(5)) : null

  await functions.punishUser(ctx, date, 'kickChatMember')
})

bot.hears(/^!mute [0-9]{0,3}[mhdw]{0,1}.*$/i, async (ctx) => {
  try {
    if (await functions.checkConds(ctx)) {
      return
    }
  
    const date = ctx.message.text.length > 5 ? functions.getDate(ctx.message.text.substr(6)) : null
  
    await functions.punishUser(ctx, date, 'restrictChatMember')

    
  } catch (err) {
    console.log(err)
  }
})

bot.hears('!unmute', async (ctx) => {
  if (await functions.checkConds(ctx)) {
    return
  }

  await functions.unMuteUser(ctx)
})

bot.command('chatid', (ctx) => ctx.reply(ctx.chat.id))

bot.on('new_chat_members', async (ctx) => {
  try {
    if (!data.chats.includes(ctx.chat.id)) {
      return 
    }

    const userId = ctx.update.message.from.id
    const oldUser = await ctx.db.collection('oldUsers').findOne({ userId: userId })
    if (oldUser != null) {
      return
    }
  
    await functions.punishUser(ctx, null, 'restrictChatMember')
  
    await ctx.reply(
      text.hello, 
      Extra.markup(Markup.inlineKeyboard([
        [Markup.urlButton('📖 Правила', 'https://teletype.in/@ramziddin/BkF3SRwoB')],
        [Markup.callbackButton('✅ Прочитал, согласен', `accept_${userId}`)]
      ]))
    )
  } catch (err) {
    console.log(err)
  }
})

bot.action(/accept_[0-9]/, async (ctx) => {
  const requiredId = +ctx.update.callback_query.data.substr(7)
  const userId = ctx.update.callback_query.from.id

  try {
    if (userId === requiredId) {
      await functions.unMuteUser(userId)
      await ctx.answerCbQuery(text.welcAgain, true)
      await ctx.deleteMessage()
      await ctx.db.collection('oldUsers').updateOne(
        { userId: userId }, { $set: { allowed: true } }, { new: true, upsert: true }
      )
    } else {
      await ctx.answerCbQuery(text.notYou, true)
    }
  } catch (err) {
    console.log(err)
  }
  
})

bot.hears(/правила/i, (ctx) => {
  ctx.reply(
    text.rules, 
    Extra.markup(Markup.inlineKeyboard(
      [Markup.urlButton('📖 Правила', 'https://teletype.in/@ramziddin/BkF3SRwoB')]
    ))
    .inReplyTo(ctx.message.message_id)
  )
})

bot.hears('!dev', (ctx) => {
  ctx.reply(text.dev, Extra.inReplyTo(ctx.message.message_id))
})

bot.hears('!help', (ctx) => {
  ctx.reply(text.help, Extra.inReplyTo(ctx.message.message_id).HTML())
})

bot.hears('!src', (ctx) => {
  ctx.reply(
    text.src,
    Extra.markup(Markup.inlineKeyboard(
      [Markup.urlButton('⌨️ GitHub', 'https://github.com/khuzha/chatadmin')]
    ))
    .inReplyTo(ctx.message.message_id).HTML()
    )
})

bot.on('message', (ctx) => {
  if (ctx.chat.type === 'private') {
    ctx.reply('Привет! Я работаю только в чате @progersuz и его ветвях.')
  }
})


bot.startPolling()