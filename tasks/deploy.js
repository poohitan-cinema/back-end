const execSSH = require('exec-ssh');
const fs = require('fs');
const { argv } = require('yargs');
const { server, repository, deploy } = require('../config');

const { appName } = deploy;
const { host, username, folder } = server;
const branch = argv.branch || argv.b || 'master';

const privateKey = fs.readFileSync('/Users/poohitan/.ssh/id_rsa');

const exec = command => execSSH({ host, username, privateKey })(`source ~/.profile && ${command}`);

const envVariables = {
  NODE_ENV: 'production',
  POOHITAN_COM_JWT_SECRET: process.env.POOHITAN_COM_JWT_SECRET,
  POOHITAN_COM_SUPERSECRET: process.env.POOHITAN_COM_SUPERSECRET,
};

const envVariablesString = Object.keys(envVariables).map(envVariableName => `export ${envVariableName}=${envVariables[envVariableName]}`).join(' && ');

exec(`git clone -b ${branch} ${repository} ${folder}/new`)
  .then(() => exec(`npm install --prefix ${folder}/new`))
  .then(() => exec(`rm -rf ${folder}/current`))
  .then(() => exec(`mv ${folder}/new ${folder}/current`))
  .then(() => exec(`pm2 stop ${appName}`))
  .then(() => exec(`${envVariablesString} && pm2 start ${folder}/current/app.js --name ${appName} --update-env`))
  .then(() => console.log('Deployed successfully.'))
  .catch(error => console.error(error))
  .then(() => process.exit());
