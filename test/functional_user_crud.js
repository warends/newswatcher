var assert = require('assert'),
    request = require('supertest')('http://localhost:3000');


describe('User Cycle Operations', function(){
  var token,
      userId,
      savedDoc;

  it('should deny unregistered user at login attempt', function(done){
    request.post('/api/sessions')
    .send({
      email: 'bush@sameple.com',
      password: 'abc123*'
    })
    .end(function(err, res){
      assert.equal(res.status, 500);
      done();
    });
  });

  it('should create a new regsitered user', function(done){
    request.post('/api/users')
    .send({
      email: 'willarends@gmail.com',
      displayName: 'willarends',
      password: 'abc123*'
    })
    .end(function(err, res){
      assert.equal(res.status, 201);
      assert.equal(res.body.displayName, 'willarends', 'Name of user should be as set');
      done();
    });
  });

  if('should not create a user twice', function(done){
    request.post('/api/users')
    .send({
      email: 'willarends@gmail.com',
      displayName: 'willarends',
      password: 'abc123*'
    })
    .end(function(err, res){
      assert.equal(res.status, 500);
      assert.equal(res.body.message, "Error: Email account already registered", "Error should already be registered");
      done();
    });
  });

  it('should detect incorrect password', function(done){
    request.post('/api/sessions')
    .send({
      email: 'willarends@gmail.com',
      password: 'wrong123*'
    })
    .end(function(err, res){
      assert.equal(res.status, 500);
      assert.equal(res.body.message, "Error: Wrong password", "Error should be already registered");
      done();
    });
  });

  it('should allow registered user to login', function(done){
    request.post('/api/sessions')
    .send({
      email: 'willarends@gmail.com',
      password: 'abc123*'
    })
    .end(function(err, res){
      token = res.body.token;
      userId = res.body.userId;
      assert.equal(res.status, 201);
      assert.equal(res.body.msg, 'Authorized', 'Message should be Authorized');
      done();
    });
  });

  it('should allow access if logged in', function(done){
    request.get('/api/users/' + userId)
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('should update the profile with the new newsFilters', function(done){
    request.put('/api/users/' + userId)
    .send({
      settings: {
				requireWIFI: true,
				enableAlerts: false
			},
			newsFilters: [{
					name: 'Politics',
					keyWords: ["Obama", "Clinton", "Bush", "Trump", "Putin"],
					enableAlert: false,
					alertFrequency: 0,
					enableAutoDelete: false,
					deleteTime: 0,
					timeOfLastScan: 0
				},
				{
					name: 'Countries',
					keyWords: ["United States", "China", "Russia", "Israel", "India", "Iran"],
					enableAlert: false,
					alertFrequency: 0,
					enableAutoDelete: false,
					deleteTime: 0,
					timeOfLastScan: 0
				}]
    })
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('should return updated news stories', function(done){
    setTimeout(function(){
      request.get('/api/users/' + userId)
      .set('x-auth', token)
      .end(function(res, res){
        assert.equal(res.status, 200);
        savedDoc = res.body.newsFilters[0].newsStories[0];
        done();
      });
    }, 3000);
  });

  it('should move a news story to the savedStories folder', function(done){
    request.post('/api/users/'+ userId + '/savedStories')
    .send(savedDoc)
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('should delete a news story from the savedStories folder', function(done){
    request.del('/api/users' + userId + '/savedStories/' + savedDoc.storyID)
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    })
  })

  it('should allow registered user to logout', function(done){
    request.del('/api/sessions/' + userId)
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('should not allow access if not logged in', function(done){
    request.get('/api/users/' + userId)
    .end(function(err, res){
      assert.equal(res.status, 500);
      done();
    });
  });

  it('should allow registered user to login', function(done){
    request.post('/api/sessions')
    .send({
      email: 'willarends@gmail.com',
      password: 'abc123*'
    })
    .end(function(err, res){
      token = res.body.token;
      userId = res.body.userId;
      assert.equal(res.status, 201);
      assert.equal(res.body.msg, 'Authorized', 'Message should be Authorized');
      done();
    });
  });

  it('should delete a registered user', function(done){
    request.del('/api/users/' + userId)
    .set('x-auth', token)
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('should return a 404 for invalid request', function(done){
    request.get('/blah')
    .end(function(err, res){
      assert.equal(res.status, 404);
      done();
    });
  });


}); //end User describe




// it('should allow access if logged in', function(done){
//     setTimeout(function(){
//       request.get('/api/users/' + userId)
//       .set('x-auth', token)
//       .end(function(err, res){
//         assert.equal(res.status, 200);
//         savedDoc = res.body.newsFilters[0].newsStories[0];
//         console.log(JSON.stringify(savedDoc, null, 4));
//         done();
//       });
//     }, 3000);
// });
