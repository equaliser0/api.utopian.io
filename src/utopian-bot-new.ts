import config from './config/config';
import * as mongoose from "mongoose";
// import * as console from "winston";
import steemAPI, {formatter} from "./server/steemAPI";
import * as request from 'superagent';
import Stats from "./server/models/stats.model";
import * as SteemConnect from 'sc2-sdk';
import Post from "./server/models/post.model";
import * as async from "async";
import {createCommentPermlink} from "./server/steemitHelpers";


(mongoose as any).Promise = Promise;
// mongoose.connect(config.mongo);

const conn = mongoose.connection;
const paidRewardsDate = '1969-12-31T23:59:59';
const botAccount = process.env.BOT;
const refreshToken = process.env.REFRESH_TOKEN;
const secret = process.env.CLIENT_SECRET;
const forced = process.env.FORCED === 'true' || false;
const now = new Date();
const MAX_VOTE_EVER = 30;
const MAX_USABLE_POOL = 1000;
const DIFFICULTY_MULTIPLIER = 3;

if (!botAccount) {
    console.log("error", "Not bot account was set");
    exit();
}

if (!refreshToken) {
    console.log("error", "Not refresh token was set");
    exit();
}

if (!secret) {
    console.log("error", "Not app secret was set");
    exit();
}


mongoose.connect(config.mongo);

const query = {
    'json_metadata.moderator.reviewed': true,
    author: {$ne: botAccount},
    'active_votes.voter': {$ne: botAccount},
    created: {
        $lte: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    },
    cashout_time: {
        $gt: paidRewardsDate,
    },
};

let categories_pool = {
    "ideas": {
        "difficulty": 0.8 * DIFFICULTY_MULTIPLIER,
        "total_vote_weight": 0,
        "max_vote": 4,
        "min_vote": 1.5,
    },
    "development": {
        "total_vote_weight": 0,
        "max_vote": MAX_VOTE_EVER,
        "min_vote": 30,
        "difficulty": 2.5 * DIFFICULTY_MULTIPLIER
    },
    "bug-hunting": {
        "total_vote_weight": 0,
        "max_vote": 5,
        "min_vote": 2,
        "difficulty": DIFFICULTY_MULTIPLIER
    },
    "translations": {
        "total_vote_weight": 0,
        "max_vote": 10,
        "min_vote": 7,
        "difficulty": 1.4 * DIFFICULTY_MULTIPLIER
    },
    "graphics": {
        "total_vote_weight": 0,
        "max_vote": MAX_VOTE_EVER,
        "min_vote": 7.5,
        "difficulty": 1.7 * DIFFICULTY_MULTIPLIER
    },
    "analysis": {
        "total_vote_weight": 0,
        "max_vote": 20,
        "min_vote": 8,
        "difficulty": 1.6 * DIFFICULTY_MULTIPLIER
    },
    "social": {
        "total_vote_weight": 0,
        "max_vote": 10,
        "min_vote": 5,
        "difficulty": 1.5 * DIFFICULTY_MULTIPLIER
    },
    "documentation": {
        "total_vote_weight": 0,
        "max_vote": 20,
        "min_vote": 5,
        "difficulty": 1.5 * DIFFICULTY_MULTIPLIER
    },
    "tutorials": {
        "total_vote_weight": 0,
        "max_vote": 15,
        "min_vote": 7,
        "difficulty": 1.9 * DIFFICULTY_MULTIPLIER
    },
    "video-tutorials": {
        "total_vote_weight": 0,
        "max_vote": 15,
        "min_vote": 8,
        "difficulty": 1.7 * DIFFICULTY_MULTIPLIER
    },
    "copywriting": {
        "total_vote_weight": 0,
        "max_vote": 15,
        "min_vote": 5,
        "difficulty": 1.55 * DIFFICULTY_MULTIPLIER
    },
    "blog": {
        "total_vote_weight": 0,
        "max_vote": 5,
        "min_vote": 2,
        "difficulty": DIFFICULTY_MULTIPLIER
    },
    "tasks-requests": {
        "total_vote_weight": 0,
        "max_vote": 6,
        "min_vote": 3,
        "difficulty": 1.1 * DIFFICULTY_MULTIPLIER
    },
};

const bots = [
    'animus',
    'appreciator',
    'arama',
    'ausbitbot',
    'bago',
    'bambam808',
    'banjo',
    'barrie',
    'bellyrub',
    'besttocome215',
    'bierkaart',
    'biskopakon',
    'blackwidow7',
    'blimbossem',
    'boomerang',
    'booster',
    'boostupvote',
    'bowlofbitcoin',
    'bp423',
    'brandybb',
    'brensker',
    'btcvenom',
    'buildawhale',
    'burdok213',
    'businessbot',
    'centerlink',
    'cleverbot',
    'cnbuddy',
    'counterbot',
    'crypto-hangouts',
    'cryptobooty',
    'cryptoholic',
    'cryptoowl',
    'cub1',
    'curationrus',
    'dahrma',
    'davidding',
    'decibel',
    'deutschbot',
    'dirty.hera',
    'discordia',
    'done',
    'drakkald',
    'drotto',
    'earthboundgiygas',
    'edrivegom',
    'emilhoch',
    'eoscrusher',
    'famunger',
    'feedyourminnows',
    'followforupvotes',
    'frontrunner',
    'fuzzyvest',
    'gamerpool',
    'gamerveda',
    'gaming-hangouts',
    'gindor',
    'givemedatsteem',
    'givemesteem1',
    'glitterbooster',
    'gonewhaling',
    'gotvotes',
    'gpgiveaways',
    'gsgaming',
    'guarddog',
    'heelpopulair',
    'helpfulcrypto',
    'idioticbot',
    'ikwindje',
    'ilvacca',
    'inchonbitcoin',
    'ipuffyou',
    'lovejuice',
    'mahabrahma',
    'make-a-whale',
    'makindatsteem',
    'maradaratar',
    'minnowbooster',
    'minnowhelper',
    'minnowpond',
    'minnowpondblue',
    'minnowpondred',
    'misterwister',
    'moonbot',
    'morwhale',
    'moses153',
    'moyeses',
    'msp-lovebot',
    'msp-shanehug',
    'msp-venezuela',
    'msp-music',
    'msp-mods',
    'msp-africa',
    'msp-canada',
    'muxxybot',
    'myday',
    'ninja-whale',
    'ninjawhale',
    'officialfuzzy',
    'perennial',
    'pimpoesala',
    'polsza',
    'portoriko',
    'prambarbara',
    'proctologic',
    'pumpingbitcoin',
    'pushup',
    'qurator',
    'qwasert',
    'raidrunner',
    'ramta',
    'randovote',
    'randowhale',
    'randowhale0',
    'randowhale1',
    'randowhaletrail',
    'randowhaling',
    'reblogger',
    'resteem.bot',
    'resteemable',
    'resteembot',
    'russiann',
    'scamnotifier',
    'scharmebran',
    'siliwilly',
    'sneaky-ninja',
    'sniffo35',
    'soonmusic',
    'spinbot',
    'stackin',
    'steemedia',
    'steemholder',
    'steemit-gamble',
    'steemit-hangouts',
    'steemitgottalent',
    'steemmaker',
    'steemmemes',
    'steemminers',
    'steemode',
    'steemprentice',
    'steemsquad',
    'steemthat',
    'steemvoter',
    'stephen.king989',
    'tabea',
    'tarmaland',
    'timbalabuch',
    'trail1',
    'trail2',
    'trail3',
    'trail4',
    'trail5',
    'trail6',
    'trail7',
    'viraltrend',
    'votey',
    'waardanook',
    'wahyurahadiann',
    'wannabeme',
    'weareone1',
    'whatamidoing',
    'whatupgg',
    'wildoekwind',
    'wiseguyhuh',
    'wistoepon',
    'zdashmash',
    'zdemonz',
    'zhusatriani'
];

console.log("info", "STARTING UTOPIAN BOT");
console.log("info", "Bot Account: " + botAccount);
console.log("info", "Checking Voting Power");

async function checkVotingPower(account) {
    const limitPower = 10000;
    return new Promise((resolve, reject) => {
        steemAPI.getAccounts([account], function (err, accounts) {
            if (!err) {
                const botStatus = accounts[0];

                const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
                const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

                if (votingPower < limitPower && !forced) {
                    resolve("Voting power is to low to start voting");
                }

                resolve(limitPower);
            }
            console.log(err);
            resolve(false);
        });
    })
}

async function getStats() {
    return new Promise((resolve, reject) => {
        Stats.get().then(stats => {
            resolve(stats);
        })
    });
}


async function prepareSteemConnect() {
    const scBase = config.steemconnectHost;
    return new Promise((resolve, reject) => {
        request
            .get(`${scBase}/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
            .end((err, res) => {
                if (!res.body.access_token) {
                    console.log("error", "Could not get access token", res);
                    exit();
                }
                if (res.body.access_token) {
                    SteemConnect.setAccessToken(res.body.access_token);
                    resolve(true);
                }
            });
    })
}

async function getPosts() {
    return new Promise((resolve, reject) => {
        Post
            .countAll({query})
            .then(limit => {
                Post
                    .list({skip: 0, limit: limit, query, sort: {net_votes: -1}})
                    .then(posts => {
                        const scoredPosts: any[] = [];

                        if (!posts.length) {
                            console.log("info", "There are no posts to vote");
                            exit();
                            return;
                        }

                        let total_weighted_length = 0;

                        for (let elt in categories_pool) {
                            categories_pool[elt].weighted_length = posts.filter(post => post.json_metadata.type === elt).length * categories_pool[elt].difficulty;
                            total_weighted_length += categories_pool[elt].weighted_length;
                        }

                        for (let elt in categories_pool) {
                            if (elt !== 'tasks-requests')
                                (categories_pool[elt] as any).assigned_pool = (posts.filter(post => post.json_metadata.type === elt).length / total_weighted_length * 100) * categories_pool[elt].difficulty * MAX_USABLE_POOL / 100;
                            else
                                (categories_pool[elt] as any).assigned_pool = (posts.filter(post => post.json_metadata.type.indexOf('task-') > -1).length / posts.length * 100) * categories_pool[elt].difficulty * MAX_USABLE_POOL / 100;
                        }

                        console.log("info", "There are: " + posts.length + " to vote.");

                        resolve(posts);
                    })
            });
    })
}

function calculateFinalVote(post, categories_pool) {

    const finalScore = post.finalScore;
    const category = post.category;
    const assignedWeight = (finalScore / categories_pool[category].total_vote_weight * 100) * categories_pool[category].assigned_pool / 100;
    const calculatedVote = Math.round(assignedWeight / categories_pool[category].assigned_pool * 100);
    let finalVote = calculatedVote;

    if (calculatedVote >= categories_pool[category].max_vote) {
        finalVote = categories_pool[category].max_vote;
    }

    if (calculatedVote <= categories_pool[category].min_vote) {
        finalVote = categories_pool[category].min_vote;
    }
    return finalVote;

}

async function getTotalVote(posts) {
   return new Promise( (resolve, reject) => {
        let total_vote = 0;

        async.each(posts, (post, callback) => {
            let vote = 0;
            vote = calculateFinalVote(post,categories_pool);
            total_vote= total_vote + vote;

            callback();
        }, function (err) {
            if (err) {
                console.log("error","An error occured while trying to calculate the total vote");
            } else {
                resolve(total_vote);
            }
        });
    })
}

async function preparePosts(posts, categories) {

    return new Promise((resolve, reject) => {
        let scoredPosts: any[] = [];
        async.each(posts, (post, callback) => {
            steemAPI.getAccounts([post.author], (err, accounts) => {
                if (!err) {
                    if (accounts && accounts.length === 1) {
                        const account = accounts[0];

                        steemAPI.getFollowCount(account.name, function (err, followers) {
                            if (!err) {
                                const contributionsQuery = {
                                    'json_metadata.moderator.reviewed': true,
                                    id: {$ne: post.id},
                                    author: post.author,
                                };

                                Post
                                    .countAll({query: contributionsQuery})
                                    .then(contributionsCount => {

                                        const achievements: string[] = [];
                                        const categoryStats = categories[post.json_metadata.type];
                                        const averageRewards = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                        const reputation = formatter.reputation(account.reputation);
                                        const votes = post.active_votes.filter(vote => bots.indexOf(vote.voter) <= 0);
                                        const getUpvotes = activeVotes => activeVotes.filter(vote => vote.percent > 0);
                                        const upVotes = getUpvotes(votes);
                                        let totalGenerated = 0;
                                        let totalWeightPercentage = 0;

                                        upVotes.forEach((upVote, upVoteIndex) => {
                                            const totalPayout = parseFloat(post.pending_payout_value)
                                                + parseFloat(post.total_payout_value)
                                                + parseFloat(post.curator_payout_value);

                                            const voteRshares = votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
                                            const ratio = totalPayout / voteRshares;
                                            const voteValue = upVote.rshares * ratio;
                                            const upvotePercentageOnTotal = (voteValue / totalPayout) * 100;

                                            totalGenerated = totalGenerated + voteValue;
                                            // fallback mechanism for big accounts never voting at their 100%. Using instead the impact on their vote on the amount of rewards
                                            totalWeightPercentage = totalWeightPercentage + (upvotePercentageOnTotal > upVote.percent ? upvotePercentageOnTotal : upVote.percent);
                                        });
                                        const upVotesLength = upVotes.length == 0 ? 1 : upVotes.length;
                                        const averageWeightPercentage = totalWeightPercentage / upVotesLength / 100;
                                        const rankConsensus = averageWeightPercentage * upVotes.length / 100;
                                        let finalScore = rankConsensus;

                                        if (finalScore > 55) {
                                            achievements.push('WOW WOW WOW People loved what you did here. GREAT JOB!');
                                        }

                                        // help the user grow the followers
                                        if (followers.follower_count < 500) {
                                            finalScore = finalScore + 20;
                                            achievements.push('You have less than 500 followers. Just gave you a gift to help you succeed!');
                                        }
                                        if (totalGenerated > averageRewards) {
                                            finalScore = finalScore + 20;
                                            achievements.push('You are generating more rewards than average for this category. Super!;)');
                                        }
                                        if (contributionsCount === 0) {
                                            // this is the first contribution of the user accepted in the Utopian feed
                                            // give the user a little gift
                                            finalScore = finalScore + 15;
                                            achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                        }
                                        // number of contributions in total
                                        if (contributionsCount > 0) {
                                            finalScore = finalScore + 5;

                                            if (contributionsCount >= 15) {
                                                // git for being productive
                                                finalScore = finalScore + 5;
                                            }
                                            if (contributionsCount >= 40) {
                                                // git for being productive
                                                finalScore = finalScore + 5;
                                            }
                                            if (contributionsCount >= 60) {
                                                // git for being productive
                                                finalScore = finalScore + 5;
                                            }
                                            if (contributionsCount >= 120) {
                                                // git for being productive
                                                finalScore = finalScore + 5;
                                            }
                                            achievements.push('Seems like you contribute quite often. AMAZING!');
                                        }

                                        if (reputation >= 25) finalScore = finalScore + 2.5;
                                        if (reputation >= 50) finalScore = finalScore + 2.5;
                                        if (reputation >= 65) finalScore = finalScore + 2.5;
                                        if (reputation >= 70) finalScore = finalScore + 2.5;

                                        post.finalScore = finalScore >= 100 ? 100 : Math.round(finalScore);
                                        post.achievements = achievements;
                                        post.category = post.json_metadata.type.indexOf('task-') > -1 ? 'tasks-requests' : post.json_metadata.type;

                                        if (post.json_metadata.type.indexOf('task-') > -1) {
                                            categories_pool['tasks-requests'].total_vote_weight = categories_pool['tasks-requests'].total_vote_weight + finalScore;
                                        } else {
                                            categories_pool[post.json_metadata.type].total_vote_weight = categories_pool[post.json_metadata.type].total_vote_weight + finalScore;
                                        }

                                        post.finalVote = calculateFinalVote(post, categories_pool);
                                        scoredPosts.push(post);
                                        setTimeout(()=>{callback();},3000);
                                    });
                            } else {
                                console.log("error", "Failed to retreive follower.", err);
                                exit();
                            }
                        });
                    }
                } else {
                    console.log("error", "Failed to retreive account.", err);
                    exit();
                }
            });


        }, function (err) {
            if (err) {
                console.log('info', 'A post failed to prepare');
            } else {
                console.log('info', 'All posts have been prepared successfully');
                resolve(scoredPosts);
            }
        });

    });

}

async function finishPost(post,  total_vote) {
    let finalVote = post.finalVote;
    const achievements = post.achievements;
    const jsonMetadata = {tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0`};
    let commentBody = '';
    let total_after_correction = 0;

    commentBody = `### Hey @${post.author} I am @${botAccount}. I have just upvoted you!\n`;

    if (achievements.length > 0) {
        commentBody += '#### Achievements\n';
        achievements.forEach(achievement => commentBody += `- ${achievement}\n`);
    }

    if (finalVote <= 7) {
        commentBody += '#### Suggestions\n';
        commentBody += `- Contribute more often to get higher and higher rewards. I wish to see you often!\n`
        commentBody += `- Work on your followers to increase the votes/rewards. I follow what humans do and my vote is mainly based on that. Good luck!\n`
        commentBody += '#### Get Noticed!\n';
        commentBody += `- Did you know project owners can manually vote with their own voting power or by voting power delegated to their projects? Ask the project owner to review your contributions!\n`
    }

    commentBody += '#### Community-Driven Witness!\n';

    commentBody += `I am the first and only Steem Community-Driven Witness. <a href="https://discord.gg/zTrEMqB">Participate on Discord</a>. Lets GROW TOGETHER!\n`
    commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-vote?witness=utopian-io&approve=1">Vote for my Witness With SteemConnect</a>\n`
    commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-proxy?proxy=utopian-io&approve=1">Proxy vote to Utopian Witness with SteemConnect</a>\n`
    commentBody += `- Or vote/proxy on <a href="https://steemit.com/~witnesses">Steemit Witnesses</a>\n`
    commentBody += `\n[![mooncryption-utopian-witness-gif](https://steemitimages.com/DQmYPUuQRptAqNBCQRwQjKWAqWU3zJkL3RXVUtEKVury8up/mooncryption-s-utopian-io-witness-gif.gif)](https://steemit.com/~witnesses)\n`
    commentBody += '\n**Up-vote this comment to grow my power and help Open Source contributions like this one. Want to chat? Join me on Discord https://discord.gg/Pc8HG9x**';

    finalVote = finalVote * MAX_USABLE_POOL / (total_vote);

    finalVote = Math.round(finalVote * 100) / 100;
    total_after_correction += finalVote;
    console.log('info','Vote: ' + finalVote + '(total:' + Math.round(total_after_correction) + ')');
    console.log('info','CATEGORY: '+ post.category, '\n');


    // SteemConnect.vote(botAccount, post.author, post.permlink, finalVote * 100)
    //     .then(() => {
    //         SteemConnect.comment(
    //             post.author,
    //             post.permlink,
    //             botAccount,
    //             createCommentPermlink(post.author, post.permlink),
    //             '',
    //             commentBody,
    //             jsonMetadata,
    //         ).then(() => {
    //             if (index + 1 === scoredPosts.length) {
    //
    //                 savedStats.bot_is_voting = false;
    //
    //                 savedStats.save().then(() => {
    //                     conn.close();
    //                     process.exit();
    //                 });
    //             }
    //         }).catch(e => {
    //             if (e.error_description == undefined) {
    //                 console.log("COMMENT SUBMITTED");
    //                 if (index + 1 === scoredPosts.length) {
    //
    //                     savedStats.bot_is_voting = false;
    //
    //                     savedStats.save().then(() => {
    //                         conn.close();
    //                         process.exit();
    //                     });
    //                 }
    //             } else {
    //                 console.log("COMMENT ERROR", e);
    //             }
    //         });
    //     }).catch(e => {
    //     // I think there is a problem with sdk. Always gets in the catch
    //     if (e.error_description == undefined) {
    //         console.log("VOTED");
    //         SteemConnect.comment(
    //             post.author,
    //             post.permlink,
    //             botAccount,
    //             createCommentPermlink(post.author, post.permlink),
    //             '',
    //             commentBody,
    //             jsonMetadata,
    //         ).then(() => {
    //             if (index + 1 === scoredPosts.length) {
    //
    //                 savedStats.bot_is_voting = false;
    //
    //                 savedStats.save().then(() => {
    //                     conn.close();
    //                     process.exit();
    //                 });
    //             }
    //         }).catch(e => {
    //             if (e.error_description == undefined) {
    //                 console.log("COMMENT SUBMITTED");
    //                 if (index + 1 === scoredPosts.length) {
    //
    //                     savedStats.bot_is_voting = false;
    //
    //                     savedStats.save().then(() => {
    //                         conn.close();
    //                         process.exit();
    //                     });
    //                 }
    //             } else {
    //                 console.log("COMMENT ERROR", e);
    //             }
    //         });
    //     }
    // });
}

function exit() {
    conn.close();
    process.exit(0);
}

async function run() {
    // let votingPower = await checkVotingPower(botAccount);
    let votingPower = 10000;
    if (!votingPower) {
        console.log("error", "An error occured");
        exit();
    }

    if (typeof votingPower === "string") {
        console.log("error", votingPower);
        exit();
    }

    console.log("info", "Voting Power is at 100% - Begin Voting Process");
    console.log("info", "Get Stats...");

    let stats: any = await getStats();
    const {categories} = stats;

    console.log("info", "Retreived Stats. Check if Bot is voting.");

    if (stats.bot_is_voting === true) {
        console.log("info", "The bot is already voting.");
        exit();
    }

    console.log("info", "The bot isnt voting. Proceed with voting procedure");

    console.log("info", "Pepare SteemConnect");

    await prepareSteemConnect();

    console.log("info", "Get Posts...")

    let posts = await preparePosts(await getPosts(), categories);

    posts = posts.slice(0,5);
    let total_vote = await getTotalVote(posts);

    console.log(total_vote);

    async.each(posts, (post, callback) => {

        console.log("info", 'Processing post ' + post.author + "/" + post.permlink);

        finishPost(post, total_vote);

        console.log("info", 'Post processed');
        callback();

    }, function (err) {
        if (err) {
            console.log('info', 'A post failed to process');
        } else {
            console.log('info', 'All posts have been processed successfully');
            exit();
        }
    });

}

conn.once('open', () => {
    run();
});

