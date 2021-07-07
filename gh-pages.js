var ghpages = require('gh-pages');

ghpages.publish(
  'public', // path to public directory
  {
    branch: 'master',
    repo: 'https://github.com/ethan-sonza/nikki.git',
    user: {
      name: 'Ethan',
      email: 'ethanjericho@yahoo.com'
    }
  },
  () => {
    console.log('Deploy Complete!')
  }
)