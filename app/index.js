const Twitter = require('twitter-lite')
const jsonfile = require('jsonfile')
const config = require('./config')

const client = new Twitter({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token_key: config.access_token_key,
  access_token_secret: config.access_token_secret,
})

;(async () => {
  // Setup log file
  const logFile = './log.json'

  let log

  try {
    log = require(logFile)
  } catch (e) {
    console.log('No log file, starting a fresh delete cycle')
    log = []
  }

  // Setup tweet deleter
  function deleteTweet(tweets, i) {
    let next = 500
    let remaining = 0

    client.post('statuses/destroy', { id: tweets[i].id })
      .then((res) => {
        remaining = parseInt(res.headers['x-rate-limit-remaining'])

        if (!isNaN(remaining) && remaining === 0) {
          console.log('Waiting')
          next = parseInt(res.headers['x-rate-limit-reset']) - Date.now()
        }

        return log.push(tweets[i])
        console.log(`Deleted: ${tweets[i].id} | ${tweets[i].full_text}`)
      })
      .catch((e) => {
        console.log(JSON.strigify(e))
      })

    // Record deleted tweets
    jsonfile.writeFile(logFile, log, { spaces: 2 })
      .then((res) => {
        if (i + 1 === tweets.length) {
          console.log('Done!')
        }

        console.log(`Next call in ${next}ms`)
        setTimeout(() => {
          deleteTweet(tweets, i + 1)
        }, next)
      })
      .catch((e) => {
        console.log('Error occurred while writing JSON')
      })
  }

  // Grab all tweets from data archive
  function getTweets() {
    global.window = { YTD: { tweet: {} } }
    const tweets = require(config.path)
    return window.YTD.tweet.part0.map((object) => object.tweet)
  }

  // Setup date
  let maxDate = config.maxDate ? new Date(config.maxDate) : new Date()

  const rawTweets = getTweets()
  const logIds = log.map((l) => l.id)
  const tweets = rawTweets.filter((t) => {
    const hasId = !isNaN(parseInt(t.id))
    const oldEnough = new Date(t.created_at) < maxDate

    // Setup excluded tweets
    const shouldBeSaved = config.saveRegExp.some((regexp) => new RegExp(regexp).test(t.full_text))
    const notDeleted = logIds.indexOf(t.id) === -1
    return hasId && oldEnough && notDeleted && !shouldBeSaved
  })

  if (!tweets || !tweets.length) {
    console.log('No more tweets to delete!')
  }

  console.log(`Starting to delete tweets older than ${maxDate}`)
  await deleteTweet(tweets, 0)
})()
