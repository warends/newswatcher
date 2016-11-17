var assert = require('assert'),
    request = require('supertest')('http://localhost:3000');

describe('News sharing and commenting operations', function () {
	var token;
	var userId;
	var storyID;
	var savedDoc;

	it("should create a new registered User", function (done) {
		request.post("/api/users")
      .send({
			email: 'willarends@gmail.com',
			displayName: 'willarends',
			password: 'abc123*'
		})
      .end(function (err, res) {
			assert.equal(res.status, 201);
			assert.equal(res.body.displayName, "willarends", "Name of user should be as set");
			done();
		});
	});

	it("should allow registered user to login", function (done) {
		request.post("/api/sessions")
      .send({
			email: 'willarends@gmail.com',
			password: 'abc123*'
		})
      .end(function (err, res) {
			token = res.body.token;
			userId = res.body.userId;
			assert.equal(res.status, 201);
			assert.equal(res.body.msg, "Authorized", "Message should be AUthorized");
			done();
		});
	});

	it("should update the profile with new newsFilters", function (done) {
		request.put("/api/users/" + userId)
      .send({
			settings: {
				requireWIFI: true,
				enableAlerts: false
			},
			newsFilters: [{
					name: 'Words',
					keyWords: ["a", "the", "and"],
					enableAlert: false,
					alertFrequency: 0,
					enableAutoDelete: false,
					deleteTime: 0,
					timeOfLastScan: 0
				}]
		})
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 200);
			done();
		});
	});

	// We need the delay, as the background process will update the news stories with the changed newsFilters
	it("should return updated news stories", function (done) {
		setTimeout(function () {
			request.get("/api/users/" + userId)
         .set('x-auth', token)
         .end(function (err, res) {
				savedDoc = res.body.newsFilters[0].newsStories[0];
				assert.equal(res.body.newsFilters[0].keyWords[0], 'a');
				done();
			});
		}, 3000);
	});

	// POST: /api/userprofile/sharestory BODY:{"filterIdx": <idx>, "storyIdx": <idx>} // To share a story
	it("should create a shared news story", function (done) {
		request.post("/api/sharednews")
      .send(savedDoc)
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 201);
			done();
		});
	});

	// GET: /api/sharednews // To get all shared news stories
	it("should return shared news story and comment", function (done) {
		request.get("/api/sharednews")
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 200);
			storyID = res.body[0].story.storyID;
			done();
		});
	});

	// POST: //api/sharednews/:id/Comments // To add a comment to a shared story, pass in storyID got from last test. Also, put in the bad language DocDB Trigger
	it("should add a new comment", function (done) {
		request.post("/api/sharednews/" + storyID + "/Comments")
      .send({ comment: "This is amazing news!" })
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 201);
			done();
		});
	});

	it("should have the added comment for the news story", function (done) {
		// Delay just a bit to make sure the async comment write takes place
		setTimeout(function () {
			request.get("/api/sharednews")
         .set('x-auth', token)
         .end(function (err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.body[0].comments[1].comment, "This is amazing news!", "Comment should be there");
				done();
			});
		}, 1000);
	});

	// DELETE: /api/sharednews
	it("should delete the shared news story", function (done) {
		request.del("/api/sharednews/" + storyID)
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 200);
			done();
		});
	});

	it("should delete a registered User", function (done) {
		request.del("/api/users/" + userId)
      .set('x-auth', token)
      .end(function (err, res) {
			assert.equal(res.status, 200);
			done();
		});
	});
});
