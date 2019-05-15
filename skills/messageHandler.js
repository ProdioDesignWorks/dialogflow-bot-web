const chrono = require('chrono-node');
const axios = require('axios');

module.exports = function(controller) {
  const {
    getState,
    changeState,
    saveData,
    getData,
    getUser,
  } = require('../utility');
  controller.on('message_received', async function(bot, message) {
    const execScript = (state, convoVars) =>
      new Promise(resolve => {
        controller.studio
          .get(bot, state, message.user, message.event)
          .then(convo => {
            convoVars &&
              Object.keys(convoVars).forEach(key =>
                convo.setVar(key, convoVars[key])
              );
            convo.on('end', convo => {
              if (convo.status === 'completed') {
                const responses = convo.extractResponses();
                resolve(responses);
              }
            });
            convo.activate();
          });
      });
    const state = await getState(message.user);
    if (!state) {
      controller.studio
        .run(bot, 'greeting', message.user, message.event)
        .then(convo => {
          convo.on('end', async () => {
            const res = await execScript('teacher_greeting');
            // if (res.teacher_register === 'Yes') {
            await execScript('location_question');
            await changeState(teachers[0], message.user);
            // } else {
            //   bot.reply(message, 'Ok Thank you');
            // }
          });
        });
      return;
    }
    console.log('state:', state);
    console.log('message:', message.text);
    const botReply = text => {
      return new Promise(resolve => {
        bot.reply(message, text, () => {
          resolve();
        });
      });
    };

    // fetch the next state or return null if current state is the last state
    const nextState = state => {
      const { teachers } = require('../chatflow');
      const currentIndex = teachers.findIndex(f => f === state);
      return teachers.length === currentIndex + 1
        ? ''
        : teachers[currentIndex + 1];
    };

    switch (state) {
      case 'teacher_category': {
        if (message.payload === 'yes') {
          const reply = {
            location: true,
          };
          await botReply(reply);
        } else if (
          message.payload === 'no' ||
          message.payload === 'notConfirmAddress'
        ) {
          await botReply('Please tell me your address?');
        } else if (message.payload && message.payload.pos) {
          console.log('address', message.payload.pos);
          const res = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${
              message.payload.pos.lat
            },${message.payload.pos.lng}&key=${process.env.GOOGLE_API_KEY}`
          );
          const address =
            res.data.results && res.data.results[0].formatted_address;
          if (address) {
            await botReply(address);
            await botReply({
              text: 'Is this your address?',
              quick_replies: [
                {
                  title: 'Yes',
                  payload: address,
                },
                {
                  title: 'No',
                  payload: 'notConfirmAddress',
                },
              ],
            });
          } else {
            await botReply(
              'Not able to find your address using google. Please tell me your address?'
            );
          }
        } else {
          console.log('address', message.text);
          const next = nextState(state);
          await changeState(next, message.user);
          await saveData(message, { address: message.text });
          const responses = await execScript(state);
          console.log('response', responses);
          await saveData(message, responses);
        }
        break;
      }
      case 'teacher_end_date': {
        const date = chrono.parseDate(message.text);
        console.log('start', date);
        if (!date) {
          await botReply('Please provide a valid date');
          return;
        }
        const now = Date.now();
        if (now > new Date(date).getTime()) {
          await botReply(
            'This date has already passed. Please provide a future date'
          );
          return;
        }
        await saveData(message, { startDate: new Date(date).getTime() });
        const next = nextState(state);
        await changeState(next, message.user);
        const responses = await execScript(state);
        console.log('response', responses);
        await saveData(message, responses);
        break;
      }
      case 'teacher_speak_clients': {
        const date = chrono.parseDate(message.text);
        console.log('end', date);
        if (!date) {
          await botReply('Please provide a valid date');
          return;
        }
        const startDate = await getData(message, 'startDate');
        if (startDate > new Date(date).getTime()) {
          await botReply(
            'End date should be after start date. Please provide a valid end date.'
          );
          return;
        }
        await saveData(message, { endDate: new Date(date).getTime() });
        const next = nextState(state);
        await changeState(next, message.user);
        await execScript(state);
        break;
      }

      case 'teacher_behalf_yes': {
        if (message.payload === 'yes') {
          const response = await execScript('teacher_behalf_yes', {
            contactNumber: '12421412421',
          });
          await saveData(message, { teacher_behalf_yes: 'yes', ...response });
        } else {
          await saveData(message, { teacher_behalf_yes: 'no' });
        }
        await execScript('teacher_platform_confirmation', {
          profileLink: 'http://www.test.com/q1233',
        });
        const user = await getUser(message.user);
        console.log(user);
        await changeState('', message.user);
        break;
      }
    }
  });
};
