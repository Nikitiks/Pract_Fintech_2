// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Forum {
    
    struct Post{
        uint id;
        string content;
        address author;
        uint timestamp;
        uint like;
    }


    event PostCreated(uint indexed id, address indexed author, uint timestamp);
    event PostDelete(address indexed initializer, uint timestamp);
    event PostLiked(uint indexed id, address indexed user, uint likes);
    event PostUnliked(uint indexed id, address indexed user, uint likes);

    address public owner;
    uint private nextId = 1;
    Post[] private posts;
    mapping(uint => mapping(address => bool)) private liked;

    constructor() {
        owner = msg.sender;
    }

    function _indexOf(uint id) internal view returns (uint) {
        for (uint i = 0; i < posts.length; i++) {
            if (posts[i].id == id) return i;
        }
        revert("Not found");
    }

    function create_post(string memory content) external {
        require(bytes(content).length > 0, "Empty post");
        posts.push(Post(nextId, content, msg.sender, block.timestamp, 0));
        emit PostCreated(nextId, msg.sender, block.timestamp);
        nextId++;
    }

    function get_posts() external view returns (Post[] memory) {
        return posts;
    }
    function get_post(uint id)external view returns(Post memory){
        return posts[_indexOf(id)];
    }
    
    function delete_post(uint id) external {
        uint idx = _indexOf(id);
        require(posts[idx].author == msg.sender, "Only author can delete");
        for (uint i = idx; i < posts.length - 1; i++) {
            posts[i] = posts[i + 1];
        }
        posts.pop();
        emit PostDelete(msg.sender, block.timestamp);
    }

    function delete_all() external {
        require(msg.sender == owner, "Only owner");
        delete posts;
        emit PostDelete(msg.sender, block.timestamp);
    }
   
   function getPostsByAuthor(address author) external view returns (Post[] memory) {
        uint count;
        for (uint i = 0; i < posts.length; i++) {
            if (posts[i].author == author) count++;
        }
        Post[] memory result = new Post[](count);
        uint j;
        for (uint i = 0; i < posts.length; i++) {
            if (posts[i].author == author) {
                result[j++] = posts[i];
            }
        }
        return result;
    }

    function like_post(uint id) external {
        uint idx = _indexOf(id);
        require(!liked[id][msg.sender], "Already liked");
        liked[id][msg.sender] = true;
        posts[idx].like++;
        emit PostLiked(id, msg.sender, posts[idx].like);
    }

    function unlike_post(uint id) external {
        uint idx = _indexOf(id);
        require(liked[id][msg.sender], "Not liked");
        liked[id][msg.sender] = false;
        posts[idx].like--;
        emit PostUnliked(id, msg.sender, posts[idx].like);
    }

    function has_liked(uint id, address user) external view returns (bool) {
        return liked[id][user];
    }
}
