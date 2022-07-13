const Twitter = require('twitter-lite')
const config = require('./config')

const client = new Twitter({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token_key: config.access_token_key,
  access_token_secret: config.access_token_secret,
})

;(async () => {
  // Verify your Twitter account
  client.get('account/verify_credentials')
    .then((res) => {
      // Should return your username
      console.log(`Hello @${res.screen_name}!`)
    })
    .catch((e) => {
      console.log(JSON.stringify(e))
    })
})()
