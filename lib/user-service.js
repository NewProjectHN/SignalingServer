const crypto = require('crypto');

var allUserList = [];
allUserList.push({user:{email:'a'},friends:[{email:'b'}]});
allUserList.push({user:{email:'b'},friends:[{email: 'a'},{email: 'c'}, {email: 'd'}]});
allUserList.push({user:{email:'c'},friends:[{email:'b'}]});
allUserList.push({user:{email:'d'},friends:[{email:'b'}]});

function doCheckLogin(username,password){
  let isFound = false;
  allUserList.forEach(user => {
    if(user.user.email == username){
      isFound = true;
    }
  });
  if(isFound){
    return crypto.randomBytes(256).toString('hex');
  }else{
    return null;
  }
}

function getFriendByUser(user){
    for(var i = 0;i < allUserList.length;i++){
      if(compareUser(allUserList[i].user,user)){
          return allUserList[i].friends;
      }
    }
    return [];
}

function compareUser(user1,user2){
  if(user1.email == user2.email){
      return true;
  }
  return false;
}
module.exports = {
    compareUser,
    doCheckLogin,
    getFriendByUser
}
