'use strict';

const Twit = require('twit');
const markitondemand = require('markitondemand');

const myHandle = 'financestockbot';

let T = new Twit({
  consumer_key: 'imtWy2RvLaVT2F58fdaS4Ld8a',
  consumer_secret: 'HiNs6BiC66EoXmjxk8NUE5izN6iQbVcjWCYit4GsI020vRAsSw',
  access_token: '825374541123878912-9bJzKuIqmgVBMfbMxZjypAGbxlXeBrK',
  access_token_secret: 'Wn6q7Mi5h6QHdyUAEGy9TsyhiJnARaNGAa0ngM7EpiZFg',
  timeout_ms: 60*1000
});

let tweetAtUser = (content, userId) => {
  T.post('statuses/update', {
    status: content,
    in_reply_to_status_id: userId
  });
};

let userStream = T.stream('user');

userStream.on('follow', (data) => {
  let userId = data.source.id;
  let userName = data.source.screen_name;

  //tweet at them (if it's not the action of me following someone!)
  if (userName.toLowerCase() !== myHandle) {
    tweetAtUser('Hi @' + userName + '! What\'s your favorite stock?', userId);
  }
});

let statusStream = T.stream('statuses/filter', {
  track: ['@' + myHandle]
});

statusStream.on('tweet', function (tweet) {
  //get username and userid
  let username = tweet.user.screen_name;
  let userId = tweet.in_reply_to_user_id;

  //example: @financestockbot FDS GOOGL
  let tweetText = tweet.text;
  let responseText = [];

  // console.log('are they tweeting at me?', tweet.in_reply_to_screen_name);
  if (tweet.in_reply_to_screen_name === myHandle) {
    // console.log('do they follow me?');
    T.get('friendships/lookup', {
      screen_name: username
    }, (err, data, response) => {
      if (err) {
        console.log('error getting friendship');
      }

      if (data[0].connections.toString().includes('followed_by')) {
        // console.log('yes, they follow me');
        let tickers = tweetText
                        .substr(myHandle.length + 1)
                        .split(' ');
        let validTickers = [];

        // console.log('find tickers in their tweet');
        //currently doesn't handle trailing text
        tickers.forEach((ticker) => {
          ticker = ticker.trim();

          if (ticker.startsWith('$')) {
            //replace invalid characters, including the leading $
            validTickers.push(ticker.replace(/[^a-zA-Z0-9]/g, ''));
          }
        });

        // console.log('querying API for stock data');
        markitondemand.getQuotes(validTickers)
          .then((tickerData) => {
            tickerData.forEach((data) => {
              responseText.push('$' + data.Symbol + ' $' + data.LastPrice + ' ' + data.ChangePercent + '%');
            });

            tweetAtUser('@' + username + ' ' + responseText.join(', '), userId);
          })
          .catch((err) => {
            if (err) {
              console.log('error getting stock data');
            }
          });
      } else {
        // console.log('nope, they don\'t follow me');
        tweetAtUser('@' + username + ', please follow me for stock info!', userId);
      }
    });
  }
});