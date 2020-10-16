const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/Post');
const checkAuth = require('../../util/check-auth');

module.exports = {
    Query: {
        async getPosts() {
          try {
            const posts = await Post.find().sort({ createdAt: -1 });
            return posts;
          } catch (err) {
            throw new Error(err);
          }
        },
        async getPost(_, { postId }) {
          try {
            const post = await Post.findById(postId);
            if (post) {
              return post;
            } else {
              throw new Error('Post not found');
            }
          } catch (err) {
            throw new Error(err);
          }
        }
      },
    Mutation: {
        async createPost(_, { body }, context){
            const user = checkAuth(context);

            if(body.trim() === ''){
                throw new Error('Post body must not be empty');
            }

            const newPost = new Post({
                body,
                user: user.id,
                username: user.username,
                createdAt: new Date().toISOString()
            });

            const post = await newPost.save();

            context.pubsub.publish('NEW_POST', {
                newPost: post
            })

            return post;
        },
        async deletePost(_, { postId }, context){
            const user = checkAuth(context);

            try{
                const post = await Post.findById(postId);
                if(user.username === post.username){
                    await post.delete();
                    return 'Post deleted successfully'
                } else {
                    throw new AuthenticationError('Action not allowed')
                }
            } catch(err){
                throw new Error(err)
            }
        },
        async likePost(_, { postId }, context){
            const { username } = checkAuth(context);
            // Find the post with the postId
            const post = await Post.findById(postId);
            // If its the correct post
            if(post){
                // Check to see if the like is from the correct user by checking username
                if(post.likes.find(like => like.username === username)){
                    // Post already liked, unlike it -- Add an unlike
                    // update the likes with JUST the likes that are not from the given username
                    post.likes = post.likes.filter(like => like.username !== username);
                    
                } else {
                    // Not liked, like post -- Add a like
                    // Add the newly created Like with the proper fields
                    post.likes.push({
                        username,
                        createdAt: new Date().toISOString()
                    })
                }

                // save it to the db
                await post.save();
                return post;
            } else throw new UserInputError('Post not found');
        }
    },
    Subscription: {
        newPost: {
            subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_POST')
        }
    }
}