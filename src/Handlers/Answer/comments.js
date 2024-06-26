const { Ques, Ans, User, Tag, Comment } = require("../../Models");
const { createNotification } = require('../Notifications/helpers');
const { commentsSerializer } = require('../../Serializers/Comments');

async function getComments(req, res, next) {

    let data = []
    let err = false;
    let user_id = req.user ? req.user._id : null;

    try {
        // const userId = req.user.id;
        const { answer_id } = req.query;
        const obj = {
            path: 'userId',
            model: User,
            options: {
                select: 'username first_name last_name is_verified profile_image'
            },
        }

        let answer = await Ans.findOne({ _id: answer_id }, 'comments').populate('comments.userId').exec();
        if (answer) {
            let comments = answer.comments;
            res.data.success = true;
            res.data.comments = commentsSerializer(comments.reverse(), user_id);
        } else {
            res.data.success = false;
            res.data.error = 'Invalid answer id';
        }

    } catch (err) {
        console.error("ERROR:", err);
        res.data.success = false;
        res.data.error = 'Some internal error.';
    } finally {
        return next();
    }
}


async function postComment(req, res, next) {

    const userId = req.user.id;
    const answerId = req.body.answer_id;
    const comment = req.body.comment;

    // const result = { isAuthenticated: true, err: false }
    const saveComment = new Comment({
        comment: comment,
        userId: userId,
        vote_count: {},
        upDown: [],
        answerId: answerId,
        posted_at: Date.now()
    })

    try {
        // const CommentSave = await saveComment.save()
        const AnsUpdate = await Ans.updateOne({ _id: answerId }, { $push: { comments: saveComment } }).exec();
        let ans_user = (await Ans.findOne({ _id: answerId }, 'userId').exec());
        ans_user = ans_user.userId;


        await createNotification(ans_user, userId, 3, answerId);

        res.data.success = true;
        res.data.is_saved = true;
        res.data.comment = {
            _id: saveComment._id,
            comment: saveComment.comment,
            vote_count: saveComment.vote_count,
            posted_at: saveComment.posted_at,
            voted: {
                user: req.user._id,
                value: 0
            },
            user: {
                _id: req.user._id,
                username: req.user.username,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                is_verified: req.user.is_verified
            }
        }
    } catch (err) {
        console.error('ERROR: ', err);
        res.data.success = false;
        res.data.error = 'Some internal error.';
        res.data.is_saved = false;
    } finally {
        return next();
    }
}

async function deleteComment(req, res, next) {
    let ans_id = req.body.answer_id;
    let comment_id = req.body.comment_id;
    let user_id = req.user._id.toString();

    console.log(ans_id, ' | ', comment_id, ' | ', user_id);

    try {
        let comment_del = await Ans.updateOne({ _id: ans_id }, {
            $pull: {
                comments: {
                    _id: comment_id,
                    userId: user_id
                }
            }
        });
        console.log('Deleting comment: ', comment_del);
        if (comment_del.nModified) {
            res.data.deleted = true;
            res.data.success = true;
        } else {
            res.data.success = false;
            res.data.error = 'Data not present.';
        }
    } catch (err) {
        console.error('Error: ', err);
        res.data.error = 'Some internal error.';
        res.data.success = false;
    } finally {
        return next();
    }
}

async function handleVoting(user, answer_id, comment_id, value) {
    let error = "Some internal error.";
    let vote = { userId: user, value: value };
    let success;

    try {
        let answer = await Ans.findOne({ _id: answer_id }).exec();
        let comment = null,
            comment_index = -1;

        if (answer === null) {
            error = "Invalid answer-id";
            throw Error(error);
        }

        for (var i = 0; i < answer.comments.length; i++) {
            if (answer.comments[i].id === comment_id) {
                comment = answer.comments[i];
                comment_index = i;
                break;
            }
        }

        if (comment === null) {
            error = "Invalid comment-id";
            throw Error(error);
        }

        let vote_index = comment.upDown.findIndex(vote => vote.userId.toString() === user.id.toString());

        {
            /*
                   if(vote_index===-1){
                       comment.upDown.push({
                           userId: user._id,
                           value: value
                       });
                       vote_index = comment.upDown.length-1;
                       switch(value){
                           case +1:
                               comment.vote_count.upvote++;
                               break;
                           case -1:
                               comment.vote_count.downvote++;
                               break;
                           default:
                               break;
                       }
                   }else{
                       switch(comment.upDown[vote_index].value){ // previoius value
                           case -1:
                               switch(value){  // current value
                                   case -1:
                                       break;
                                   case 0:
                                       comment.vote_count.downvote--;
                                       break;
                                   case 1:
                                       comment.vote_count.downvote--;
                                       comment.vote_count.upvote++;
                                       break;
                               }
                               break;
                           
                           case 0:
                               switch(value){  // current value
                                   case -1:
                                       comment.vote_count.downvote++;
                                   case 0:
                                       break;
                                   case 1:
                                       comment.vote_count.upvote++;
                                       break;
                               }
                               break;
                           
                           case +1:
                               switch(value){  // current value
                                   case -1:
                                       comment.vote_count.upvote--;
                                       comment.vote_count.downvote++;
                                   case 0:
                                       comment.vote_count.upvote--;
                                       break;
                                   case +1:
                                       break;
                               }
                               break;
                       }
                       comment.upDown[vote_index].value = value;
                   }
                   */
        }


        if (vote_index === -1) {
            comment.upDown.push({
                userId: user._id,
                value: value
            });
            vote_index = comment.upDown.length - 1;
        } else {
            comment.upDown[vote_index].value = value;
        }

        let upvote = 0,
            downvote = 0;
        comment.upDown.forEach((vote) => {
            switch (vote.value) {
                case -1:
                    downvote++;
                    break;
                case +1:
                    upvote++;
                    break;
                default:
                    break;
            }
        });
        comment.vote_count = { upvote, downvote };

        answer.comments[comment_index] = comment;
        answer = await answer.save();

        success = true;
        vote = answer.comments[comment_index].upDown[vote_index];
        vote_count = answer.comments[comment_index].vote_count;
        error = null;

    } catch (err) {
        success = false;
        vote = null;
    } finally {
        return { success, vote, error, vote_count };
    }
}


async function upvoteComment(req, res, next) {

    let user = req.user;
    let answer_id = req.query.answer_id;
    let comment_id = req.query.comment_id;

    let { success, vote, error, vote_count } = await handleVoting(user, answer_id, comment_id, +1);

    res.data.success = success;
    res.data.error = error;
    res.data.vote = vote;
    res.data.vote_count = vote_count;

    return next();
}

async function downvoteComment(req, res, next) {
    let user = req.user;
    let answer_id = req.query.answer_id;
    let comment_id = req.query.comment_id;

    let { success, vote, error, vote_count } = await handleVoting(user, answer_id, comment_id, -1);

    res.data.success = success;
    res.data.error = error;
    res.data.vote = vote;
    res.data.vote_count = vote_count;

    return next();
}


async function unvoteComment(req, res, next) {
    let user = req.user;
    let answer_id = req.query.answer_id;
    let comment_id = req.query.comment_id;

    let { success, vote, error, vote_count } = await handleVoting(user, answer_id, comment_id, 0);

    res.data.success = success;
    res.data.error = error;
    res.data.vote = vote;
    res.data.vote_count = vote_count;
    return next();
}


module.exports = {
    getComments,
    postComment,
    deleteComment,

    upvoteComment,
    downvoteComment,
    unvoteComment
};