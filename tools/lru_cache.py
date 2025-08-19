class ListNode:
    """双向链表节点"""
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """LRU缓存实现，使用双向链表 + 哈希表"""
    
    def __init__(self, capacity: int):
        """
        初始化LRU缓存
        :param capacity: 缓存容量
        """
        self.capacity = capacity
        self.cache = {}  # 哈希表：key -> ListNode
        
        # 创建虚拟头尾节点，简化边界处理
        self.head = ListNode()
        self.tail = ListNode()
        self.head.next = self.tail
        self.tail.prev = self.head
    
    def _add_node(self, node):
        """在头部添加节点"""
        node.prev = self.head
        node.next = self.head.next
        
        self.head.next.prev = node
        self.head.next = node
    
    def _remove_node(self, node):
        """移除指定节点"""
        prev_node = node.prev
        next_node = node.next
        
        prev_node.next = next_node
        next_node.prev = prev_node
    
    def _move_to_head(self, node):
        """将节点移动到头部（标记为最近使用）"""
        self._remove_node(node)
        self._add_node(node)
    
    def _pop_tail(self):
        """移除尾部节点（最久未使用的节点）"""
        last_node = self.tail.prev
        self._remove_node(last_node)
        return last_node
    
    def get(self, key: int) -> int:
        """
        获取key对应的value
        :param key: 键
        :return: 存在返回value，不存在返回-1
        """
        node = self.cache.get(key)
        
        if not node:
            return -1
        
        # 将访问的节点移到头部（标记为最近使用）
        self._move_to_head(node)
        
        return node.value
    
    def put(self, key: int, value: int) -> None:
        """
        插入或更新key-value对
        :param key: 键
        :param value: 值
        """
        node = self.cache.get(key)
        
        if not node:
            # 新增节点
            new_node = ListNode(key, value)
            
            self.cache[key] = new_node
            self._add_node(new_node)
            
            # 检查是否超出容量
            if len(self.cache) > self.capacity:
                # 移除最久未使用的节点
                tail_node = self._pop_tail()
                del self.cache[tail_node.key]
        else:
            # 更新现有节点
            node.value = value
            self._move_to_head(node)


# 测试代码
if __name__ == "__main__":
    # 测试用例1
    print("=== 测试用例1 ===")
    lru = LRUCache(2)
    
    lru.put(1, 1)
    lru.put(2, 2)
    print(f"get(1): {lru.get(1)}")  # 返回 1
    
    lru.put(3, 3)  # 该操作会使得 key 2 作废
    print(f"get(2): {lru.get(2)}")  # 返回 -1 (未找到)
    
    lru.put(4, 4)  # 该操作会使得 key 1 作废
    print(f"get(1): {lru.get(1)}")  # 返回 -1 (未找到)
    print(f"get(3): {lru.get(3)}")  # 返回 3
    print(f"get(4): {lru.get(4)}")  # 返回 4
    
    # 测试用例2
    print("\n=== 测试用例2 ===")
    lru2 = LRUCache(3)
    
    lru2.put(1, 10)
    lru2.put(2, 20)
    lru2.put(3, 30)
    print(f"get(2): {lru2.get(2)}")  # 返回 20，并将2移到最前
    
    lru2.put(4, 40)  # 容量满了，移除最久未使用的key 1
    print(f"get(1): {lru2.get(1)}")  # 返回 -1
    print(f"get(2): {lru2.get(2)}")  # 返回 20
    print(f"get(3): {lru2.get(3)}")  # 返回 30
    print(f"get(4): {lru2.get(4)}")  # 返回 40
    
    # 测试更新操作
    print("\n=== 测试更新操作 ===")
    lru2.put(2, 200)  # 更新key 2的值
    print(f"get(2): {lru2.get(2)}")  # 返回 200