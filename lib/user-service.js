const crypto = require('crypto');

var allUserList = [];
allUserList.push({user:{userId:'a'},friends:[{userId:'b'}]});
allUserList.push({user:{userId:'b'},friends:[{userId: 'a'},{userId: 'c'}, {userId: 'd'}]});
allUserList.push({user:{userId:'c'},friends:[{userId:'b'}]});
allUserList.push({user:{userId:'d'},friends:[{userId:'b'}]});

function doCheckLogin(username,password){
  let isFound = false;
  allUserList.forEach(user => {
    if(user.user.userId == username){
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
  if(user1.userId == user2.userId){
      return true;
  }
  return false;
}
module.exports = {
    compareUser,
    doCheckLogin,
    getFriendByUser
}
