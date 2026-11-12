const contract_address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

let current_account;
let web3;
let contract;
let authorFilter = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
    $('connection_btn').addEventListener('click', connectWallet);
    $('makePost_btn').addEventListener('click', makePost);
    $('deleteAll_btn').addEventListener('click', delete_all);

    $('filter_btn').addEventListener('click', () => {
        const addr = $('author_filter').value.trim();
        if (!web3.utils.isAddress(addr)) {
            alert("Некоректна адреса");
            return;
        }
        authorFilter = addr;
        getPosts();
    });
    $('myPosts_btn').addEventListener('click', () => {
        authorFilter = current_account;
        $('author_filter').value = current_account;
        getPosts();
    });
    $('allPosts_btn').addEventListener('click', () => {
        authorFilter = null;
        $('author_filter').value = '';
        getPosts();
    });

    // MetaMask, если есть, иначе прямое подключение к Hardhat
    web3 = new Web3(window.ethereum || 'http://127.0.0.1:8545');
    contract = new web3.eth.Contract(abi, contract_address);

    if (window.ethereum) {
        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length === 0) {
                current_account = undefined;
                return;
            }
            current_account = accounts[0];
            enterToDapp();
            getPosts();
        });

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            current_account = accounts[0];
            $('connection_btn').hidden = true;
            enterToDapp();
        }
    }

    await getPosts();
});

const connectWallet = async (e) => {
    if (!window.ethereum) {
        alert("Please install web3 provider");
        return;
    }
    try {
        const accounts = window.ethereum
            ? await window.ethereum.request({ method: 'eth_requestAccounts' })
            : await web3.eth.getAccounts();   // аккаунты Hardhat
        if (!accounts || accounts.length === 0) {
            alert("Accounts not found");
            return;
        }
        current_account = accounts[0];
        e.target.hidden = true;
        enterToDapp();
        await getPosts();
    } catch (error) {
        alert("Connect to DApp error. See logs");
        console.error("Connect error: ", error);
    }
};

const enterToDapp = () => {
    const lbl = $('account_lbl');
    lbl.hidden = false;
    lbl.textContent = current_account;
    lbl.style.color = 'darkgreen';
    $('dapp').hidden = false;
};

const makePost = async () => {
    try {
        const input = $('post_text');
        const message = input.value.trim();
        if (!message) {
            alert("Post cannot be without text!");
            return;
        }
        await contract.methods.create_post(message).send({ from: current_account });
        input.value = '';
        await getPosts();
    } catch (error) {
        console.error("Make post error: ", error);
        alert("Make post error. See logs");
    }
};

const getPosts = async () => {
    try {
        const posts = authorFilter
            ? await contract.methods.getPostsByAuthor(authorFilter).call()
            : await contract.methods.get_posts().call();

        // для каждого поста узнаём, лайкнул ли его текущий пользователь
        const liked = await Promise.all(posts.map(p =>
            current_account
                ? contract.methods.has_liked(p.id, current_account).call()
                : false
        ));
        renderPosts(posts, liked);
    }  catch (error) {
        console.error("Get posts error:", error);
        console.error("message:", error?.message, "| code:", error?.code, "| cause:", error?.cause);
    }
};

const renderPosts = (posts, liked) => {
    const postList = $('postList');
    postList.replaceChildren();

    if (posts.length === 0) {
        const p = document.createElement('p');
        p.textContent = "Not posts yet";
        postList.appendChild(p);
        return;
    }

    posts.forEach((post, i) => {
        const card = document.createElement('div');
        card.className = 'card';

        const author = document.createElement('div');
        author.className = 'author';
        author.textContent = `Author: ${post.author}`;

        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = post.content;

        const time = document.createElement('div');
        time.className = 'time';
        time.textContent = new Date(Number(post.timestamp) * 1000).toLocaleString();

        const actions = document.createElement('div');
        actions.className = 'actions';

        const likeBtn = document.createElement('button');
        likeBtn.textContent = `${liked[i] ? '💔 Unlike' : '👍 Like'} (${post.like})`;
        likeBtn.addEventListener('click', () => toggleLike(post.id, liked[i]));
        actions.appendChild(likeBtn);

        // кнопка удаления — только у автора
        if (current_account && post.author.toLowerCase() === current_account.toLowerCase()) {
            const delBtn = document.createElement('button');
            delBtn.className = 'danger';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => delete_post(post.id));
            actions.appendChild(delBtn);
        }

        card.append(author, content, time, actions);
        postList.appendChild(card);
    });
};

const toggleLike = async (id, isLiked) => {
    try {
        const method = isLiked ? 'unlike_post' : 'like_post';
        await contract.methods[method](id).send({ from: current_account });
        await getPosts();
    } catch (error) {
        console.error("Like error: ", error);
        alert("Like error. See logs");
    }
};

const delete_post = async (id) => {
    try {
        await contract.methods.delete_post(id).send({ from: current_account });
        await getPosts();
    } catch (error) {
        console.error("Delete error: ", error);
        alert("Delete error (только автор может удалить). See logs");
    }
};

const delete_all = async () => {
    try {
        await contract.methods.delete_all().send({ from: current_account });
        await getPosts();
    } catch (error) {
        console.error("Delete all error: ", error);
        alert("Delete all error (только владелец контракта). See logs");
    }
};



// document.addEventListener('DOMContentLoaded', ()=>{
//     const connection_btn = document.getElementById('connection_btn');
//     if(connection_btn) connection_btn.addEventListener('click', connectWallet);

//     const makePost_btn = document.getElementById('makePost_btn');
//     if(makePost_btn) makePost_btn.addEventListener('click', makePost);

//     const deleteAll_btn = document.getElementById("deleteAll_btn");
//     if(deleteAll_btn) deleteAll_btn.addEventListener('click', delete_all);

//     const delete_btn = document.getElementById("delete_btn");
//     if(delete_btn) delete_btn.addEventListener('click', delete_post);

//     if(window.ethereum){
        
//         web3 = new Web3(window.ethereum);
//         contract = new web3.eth.Contract(abi, contract_address);

        
//         window.ethereum.on("accountsChanged",(accounts)=>{
//             if(accounts.length === 0){
//                 alert("Accounts not found");
//                 current_account = undefined;
//                 return;
//             }
//             current_account = accounts[0];
//             enterToDapp();
//         })

//         contract.events.PostCreated({fromBlock: "latest"})
//         .on("data", async(event)=>{
//             console.log("Post created: ", event.returnValues);
//             await getPosts();
//         });

//         contract.events.PostDelete({fromBlock: "latest"})
//         .on("data", async(event)=>{
//             console.log("Post or posts delete: ", event.returnValues);
//             await getPosts();
//         })

//         getPosts();
//     }
// })

// const makePost = async()=>{
//     try {
//         const post_text = document.getElementById("post_text");
//         if(!post_text){
//             alert("Post cannot be without text!");
//             return;
//         }

//         const message = post_text.value;

//         await contract.methods.create_post(message).send({from: current_account});
//         post_text.value = '';

//         const posts = await contract.methods.get_posts().call();
//         console.log("Posts: ", posts);
//     } catch (error) {
//         console.error("Make post error: ", error);
//         alert("Make post error. See logs");
//     }
// }

// const connectWallet = async(e)=>{
//     if(!window.ethereum){
//         alert("Please install web3 provider");
//         return;
//     }
//     try {
//         const accounts = await window.ethereum.request({
//             method: 'eth_requestAccounts'
//         });
//         if(!accounts || !Array.isArray(accounts)){
//             alert("Accounts not found");
//             return;
//         }
//         if(accounts.length === 0 ){
//             alert("Accounts not found")
//             return;
//         }
//         current_account = accounts[0];
//         e.target.hidden = true;
//         enterToDapp();
//     } catch (error) {
//         alert("Connect to DApp error. See logs");
//         console.error("Connect error: ", error);
//     }
// }

// const enterToDapp = ()=>{
//     const account_lbl = document.getElementById('account_lbl');
//     account_lbl.hidden = false;
//     account_lbl.textContent = current_account;
//     account_lbl.style.color = 'darkgreen';

//     const dapp = document.getElementById('dapp');
//     if(dapp) dapp.hidden = false;
// }

// const getPosts = async()=>{
//     try{
//         const posts = await contract.methods.get_posts().call();
//         renderPosts(posts);
//     }catch(error){
//         console.error("Get posts error: ", error);
//         alert("Trouble with get posts. See logs");
//     }
// }

// const renderPosts = (posts)=>{
//     const postList = document.getElementById("postList");

//     while(postList.firstChild)
//         postList.removeChild(postList.firstChild);

//     if(posts.length === 0){
//         const p = document.createElement('p');
//         p.textContent = "Not posts yet";
//         postList.appendChild(p);
//         return;
//     }
//     let id = 0;
//     posts.forEach(post=>{
//         const div = document.createElement('div');

//         const author = document.createElement('p');
//         author.textContent = `Author: ${post.author}`;

//         const content = document.createElement('p');
//         content.textContent = `Content: ${post.content}`;

//         const timestamp = document.createElement('p');
//         timestamp.textContent = `Created at: ${new Date(Number(post.timestamp) * 1000)}`;

//         const likes = document.createElement('p');
//         likes.textContent = `👍: ${post.like}`;

//         const deleteBtn = document.createElement('button');
//         deleteBtn.textContent = 'Delete';
//         deleteBtn.addEventListener('click', async()=>{
//             console.log("Delete post by id: ",id);
//             await delete_post(id);
//         });
//         id++;

//         div.appendChild(author)
//         div.appendChild(content)
//         div.appendChild(timestamp)
//         div.appendChild(likes)
//         div.appendChild(deleteBtn)
//         div.appendChild(document.createElement('hr'));

//         postList.appendChild(div);
//     })
// }

//  const delete_post = async(id)=>{
//     if(id < 0) return;

//     await contract.methods.delete_post(id).send({from: current_account});
//  }

//  const delete_all = async()=>{
//     await contract.methods.delete_all().send({from: current_account});
//  }
/**
 * Додайте видалення постів:
 * окремих та всіх
 * На фронтенді додати відповідні кнопки, при видаленні має спрацювати подія щщо пост або пости видалені, необхідно оновити список постів на фронтенді.
 * 
 */