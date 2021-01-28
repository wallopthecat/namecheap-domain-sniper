import { createRequire } from 'module';  //added for new version of node
const require = createRequire(import.meta.url);

require('dotenv').config();

import NameCheap from '@rqt/namecheap';
import twilio from 'twilio';

const processStartTime = process.hrtime();

const options = { user: process.env.NAMECHEAP_USER, key: process.env.NAMECHEAP_API_KEY, ip: process.env.NAMECHEAP_IP };


async function search() {
  try {
    // 0. Create a client.
    const { user, key, ip } = options;
    const domain = process.env.DOMAIN;

    const namecheap = new NameCheap({
      user, key, sandbox: false, ip,
    })

    // 1. Check a domain.
    const c = await namecheap.domains.check(domain);
    console.log(`${domain} is available? ${c[0].Available}`);
    // console.log('Check:', c, '\n')

    if (c[0].Available) {

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
          const client = new twilio(accountSid, authToken);
    
          client.messages.create({
              body: `${domain} available!`,
              to: process.env.TWILIO_TO_NUMBER,  // Text this number
              from: process.env.TWILIO_FROM_NUMBER // From a valid Twilio number
          })
          .then((message) => console.log(message.sid));
      }

      // 2. Get list of addresses on the account.
      const cc = await namecheap.address.getList()
      console.log('Addresses:', cc, '\n')

      // 3. Find the default address and get its info.
      const { AddressId } = cc.find(({ IsDefault }) => IsDefault)
      const address = await namecheap.address.getInfo(AddressId)

      // 4. Register the domain using the address.
      const r = await namecheap.domains.create({
        domain,
        address,
      })
      console.log('Registered:', r, '\n')

      // 5. Retrieve info about domain.
      const info = await namecheap.domains.getInfo(domain)
      console.log('Info:', info, '\n')

      // 6. Get a list of domains (with filter).
      const list = await namecheap.domains.getList({
        filter: domain,
      })
      console.log('List:', list, '\n')
      process.exit(0);
    }

  } catch (err) {
    console.log(err)
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(function loop() {
  let rand = getRandomInt(10000, 60000);
  console.log("| waiting |", rand/1000, 's');
  setTimeout(function() {
    search().then(() => {
      console.log(process.hrtime(processStartTime));
      loop();
    });
  }, rand);
})();
