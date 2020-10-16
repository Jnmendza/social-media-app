const { AuthenticationError, UserInputError } = require('apollo-server');

const checkAuth = require('../../util/check-auth');
const Post = require('../../models/Post');

module.exports = {
    Mutation: {
        createComment: async (_, { postId, body }, context) => {
            // First make sure we have a valid user by checking Auth
            const { username } = checkAuth(context);
            if(body.trim() === ''){
                // body of the comment cannot by empty
                throw new UserInputError('Empty comment', {
                    errors: {
                        body: 'Comment body must not be empty'
                    }
                })
            }

            const post = await Post.findById(postId);

            if(post){
                post.comments.unshift({
                    body,
                    username,
                    createdAt: new Date().toISOString()
                })
                await post.save()
                return post;
            } else throw new UserInputError('Post not found');
        },
        async deleteComment(_, { postId, commentId }, context) {
            // First make sure we have a valid user by checking Auth
            const { username } = checkAuth(context);
            // Then find the post with the specific Id
            const post = await Post.findById(postId);

            // We'll find the comment in the array of comments so we have to locate the index in comments array
            if(post){
                // Find the idx of the comment by matching the comment's ID
                const commentIndex = post.comments.findIndex(comment => comment.id === commentId);

                // If the username of the post matches the username from checkAuth...
                if(post.comments[commentIndex].username === username){
                    // ... remove it from the array with splice and using the commentIdx to locate it
                    post.comments.splice(commentIndex, 1);
                    // with the new array updated without the comment, save it to the db
                    await post.save();
                    // return the new post array
                    return post;
                } else {
                    throw new AuthenticationError('Action not allowed')
                }
            } else {
                throw new UserInputError('Post not found!')
            }
        }
    }
};