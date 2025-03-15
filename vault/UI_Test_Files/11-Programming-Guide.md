---
id: doc-ui-test-programming-guide
createdAt: '2025-03-15T19:10:00.000Z'
updatedAt: '2025-03-15T19:10:00.000Z'
versions:
  - id: ver-ui-test-programming-guide-initial
    createdAt: '2025-03-15T19:10:00.000Z'
    message: Initial version
annotations:
  - id: anno-code-explanation-1
    documentId: doc-ui-test-programming-guide
    startOffset: 1500
    endOffset: 1700
    content: "This recursive approach has O(2^n) time complexity which is inefficient. Consider memoization to improve performance."
    color: red
    createdAt: '2025-03-15T19:10:10.000Z'
    updatedAt: '2025-03-15T19:10:10.000Z'
    tags: ["performance", "algorithm"]
  - id: anno-code-explanation-2
    documentId: doc-ui-test-programming-guide
    startOffset: 3200
    endOffset: 3400
    content: "The async/await pattern is preferred in modern JavaScript over traditional Promise chains for better readability and error handling."
    color: blue
    createdAt: '2025-03-15T19:10:20.000Z'
    updatedAt: '2025-03-15T19:10:20.000Z'
    tags: ["best-practice", "javascript"]
tags:
  - programming
  - tutorial
  - code-examples
  - algorithms
---

# The Programmer's Notebook

This document contains various programming examples, algorithms, and code snippets in different languages to test how the UI handles code formatting, syntax highlighting, and technical content.

## Table of Contents

1. [Basic Algorithms](#basic-algorithms)
2. [Data Structures](#data-structures)
3. [Design Patterns](#design-patterns)
4. [Language-Specific Examples](#language-specific-examples)
5. [API Integration Examples](#api-integration-examples)
6. [Performance Optimization](#performance-optimization)

## Basic Algorithms

### Fibonacci Sequence

The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones, usually starting with 0 and 1.

#### Recursive Implementation (JavaScript)

```javascript
function fibonacci(n) {
    // Base cases
    if (n <= 0) return 0;
    if (n === 1) return 1;
    
    // Recursive case
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Example usage
console.log(fibonacci(10)); // Output: 55
```

#### Dynamic Programming Implementation (Python)

```python
def fibonacci_dp(n):
    # Initialize array to store Fibonacci numbers
    fib = [0] * (n + 1)
    
    # Base cases
    fib[0] = 0
    if n > 0:
        fib[1] = 1
    
    # Build up the array
    for i in range(2, n + 1):
        fib[i] = fib[i - 1] + fib[i - 2]
    
    return fib[n]

# Example usage
print(fibonacci_dp(10))  # Output: 55
```

### Sorting Algorithms

#### Quick Sort (Java)

```java
public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            // Find the partition index
            int pi = partition(arr, low, high);
            
            // Recursively sort elements before and after partition
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }
    
    private static int partition(int[] arr, int low, int high) {
        // Choose the rightmost element as pivot
        int pivot = arr[high];
        
        // Index of smaller element
        int i = (low - 1);
        
        for (int j = low; j < high; j++) {
            // If current element is smaller than the pivot
            if (arr[j] < pivot) {
                i++;
                
                // Swap arr[i] and arr[j]
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        
        // Swap arr[i+1] and arr[high] (or pivot)
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        
        return i + 1;
    }
    
    // Example usage
    public static void main(String[] args) {
        int[] arr = {10, 7, 8, 9, 1, 5};
        quickSort(arr, 0, arr.length - 1);
        
        for (int num : arr) {
            System.out.print(num + " ");
        }
        // Output: 1 5 7 8 9 10
    }
}
```

## Data Structures

### Linked List Implementation (C++)

```cpp
#include <iostream>

class Node {
public:
    int data;
    Node* next;
    
    Node(int val) : data(val), next(nullptr) {}
};

class LinkedList {
private:
    Node* head;
    
public:
    LinkedList() : head(nullptr) {}
    
    // Add a new node at the front
    void push_front(int new_data) {
        Node* new_node = new Node(new_data);
        new_node->next = head;
        head = new_node;
    }
    
    // Add a new node after a given node
    void insert_after(Node* prev_node, int new_data) {
        if (prev_node == nullptr) {
            std::cout << "The given previous node cannot be NULL";
            return;
        }
        
        Node* new_node = new Node(new_data);
        new_node->next = prev_node->next;
        prev_node->next = new_node;
    }
    
    // Add a new node at the end
    void push_back(int new_data) {
        Node* new_node = new Node(new_data);
        
        if (head == nullptr) {
            head = new_node;
            return;
        }
        
        Node* last = head;
        while (last->next != nullptr) {
            last = last->next;
        }
        
        last->next = new_node;
    }
    
    // Delete a node with given key
    void remove(int key) {
        Node* temp = head;
        Node* prev = nullptr;
        
        // If head node itself holds the key to be deleted
        if (temp != nullptr && temp->data == key) {
            head = temp->next;
            delete temp;
            return;
        }
        
        // Search for the key to be deleted
        while (temp != nullptr && temp->data != key) {
            prev = temp;
            temp = temp->next;
        }
        
        // If key was not present in linked list
        if (temp == nullptr) return;
        
        // Unlink the node from linked list
        prev->next = temp->next;
        delete temp;
    }
    
    // Print the linked list
    void print_list() {
        Node* node = head;
        while (node != nullptr) {
            std::cout << node->data << " ";
            node = node->next;
        }
        std::cout << std::endl;
    }
    
    // Destructor to free memory
    ~LinkedList() {
        Node* current = head;
        Node* next = nullptr;
        
        while (current != nullptr) {
            next = current->next;
            delete current;
            current = next;
        }
        
        head = nullptr;
    }
};

// Example usage
int main() {
    LinkedList list;
    
    list.push_back(1);
    list.push_front(2);
    list.push_back(3);
    list.push_front(4);
    list.insert_after(list.head->next, 5);
    
    std::cout << "Linked List: ";
    list.print_list();  // Output: 4 2 5 1 3
    
    list.remove(5);
    std::cout << "After removing 5: ";
    list.print_list();  // Output: 4 2 1 3
    
    return 0;
}
```

### Binary Search Tree (TypeScript)

```typescript
class TreeNode {
    value: number;
    left: TreeNode | null;
    right: TreeNode | null;
    
    constructor(value: number) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    root: TreeNode | null;
    
    constructor() {
        this.root = null;
    }
    
    insert(value: number): BinarySearchTree {
        const newNode = new TreeNode(value);
        
        if (this.root === null) {
            this.root = newNode;
            return this;
        }
        
        let current = this.root;
        
        while (true) {
            if (value === current.value) return this;
            
            if (value < current.value) {
                if (current.left === null) {
                    current.left = newNode;
                    return this;
                }
                current = current.left;
            } else {
                if (current.right === null) {
                    current.right = newNode;
                    return this;
                }
                current = current.right;
            }
        }
    }
    
    find(value: number): TreeNode | null {
        if (this.root === null) return null;
        
        let current = this.root;
        let found = false;
        
        while (current && !found) {
            if (value < current.value) {
                current = current.left;
            } else if (value > current.value) {
                current = current.right;
            } else {
                found = true;
            }
        }
        
        if (!found) return null;
        return current;
    }
    
    // Breadth-first search
    bfs(): number[] {
        const data: number[] = [];
        const queue: TreeNode[] = [];
        let node: TreeNode | null = this.root;
        
        if (node) queue.push(node);
        
        while (queue.length) {
            node = queue.shift() || null;
            
            if (node) {
                data.push(node.value);
                if (node.left) queue.push(node.left);
                if (node.right) queue.push(node.right);
            }
        }
        
        return data;
    }
    
    // Depth-first search - preorder
    dfsPreOrder(): number[] {
        const data: number[] = [];
        
        function traverse(node: TreeNode | null) {
            if (node) {
                data.push(node.value);
                if (node.left) traverse(node.left);
                if (node.right) traverse(node.right);
            }
        }
        
        traverse(this.root);
        return data;
    }
    
    // Depth-first search - inorder
    dfsInOrder(): number[] {
        const data: number[] = [];
        
        function traverse(node: TreeNode | null) {
            if (node) {
                if (node.left) traverse(node.left);
                data.push(node.value);
                if (node.right) traverse(node.right);
            }
        }
        
        traverse(this.root);
        return data;
    }
    
    // Depth-first search - postorder
    dfsPostOrder(): number[] {
        const data: number[] = [];
        
        function traverse(node: TreeNode | null) {
            if (node) {
                if (node.left) traverse(node.left);
                if (node.right) traverse(node.right);
                data.push(node.value);
            }
        }
        
        traverse(this.root);
        return data;
    }
}

// Example usage
const bst = new BinarySearchTree();
bst.insert(10);
bst.insert(6);
bst.insert(15);
bst.insert(3);
bst.insert(8);
bst.insert(20);

console.log(bst.bfs());         // [10, 6, 15, 3, 8, 20]
console.log(bst.dfsPreOrder()); // [10, 6, 3, 8, 15, 20]
console.log(bst.dfsInOrder());  // [3, 6, 8, 10, 15, 20]
console.log(bst.dfsPostOrder());// [3, 8, 6, 20, 15, 10]
```

## Design Patterns

### Singleton Pattern (Python)

```python
class Singleton:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Singleton, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        self.value = 0
    
    def increment(self):
        self.value += 1
        return self.value

# Example usage
s1 = Singleton()
s2 = Singleton()

print(s1 is s2)  # Output: True (both variables reference the same instance)

s1.increment()
print(s2.value)  # Output: 1 (changes to s1 affect s2 because they're the same object)
```

### Observer Pattern (JavaScript)

```javascript
class Subject {
    constructor() {
        this.observers = [];
    }
    
    subscribe(observer) {
        this.observers.push(observer);
    }
    
    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }
    
    notify(data) {
        this.observers.forEach(observer => observer.update(data));
    }
}

class Observer {
    constructor(name) {
        this.name = name;
    }
    
    update(data) {
        console.log(`${this.name} received update: ${data}`);
    }
}

// Example usage
const subject = new Subject();

const observer1 = new Observer('Observer 1');
const observer2 = new Observer('Observer 2');

subject.subscribe(observer1);
subject.subscribe(observer2);

subject.notify('Hello World!');
// Output:
// Observer 1 received update: Hello World!
// Observer 2 received update: Hello World!

subject.unsubscribe(observer1);
subject.notify('Another update');
// Output:
// Observer 2 received update: Another update
```

## Language-Specific Examples

### Asynchronous Programming in JavaScript

```javascript
// Using Promises
function fetchDataWithPromise(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data fetched successfully:', data);
            return data;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            throw error;
        });
}

// Using async/await
async function fetchDataWithAsync(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Example usage
fetchDataWithPromise('https://api.example.com/data')
    .then(data => console.log('Processing data:', data.length))
    .catch(error => console.log('Handling error:', error.message));

// Using async/await with IIFE
(async () => {
    try {
        const data = await fetchDataWithAsync('https://api.example.com/data');
        console.log('Processing data:', data.length);
    } catch (error) {
        console.log('Handling error:', error.message);
    }
})();
```

### Generics in TypeScript

```typescript
// Generic function
function identity<T>(arg: T): T {
    return arg;
}

const output1 = identity<string>("myString");  // type of output will be 'string'
const output2 = identity<number>(100);         // type of output will be 'number'

// Generic interface
interface GenericIdentityFn<T> {
    (arg: T): T;
}

function identity2<T>(arg: T): T {
    return arg;
}

let myIdentity: GenericIdentityFn<number> = identity2;

// Generic class
class GenericNumber<T> {
    zeroValue: T;
    add: (x: T, y: T) => T;
    
    constructor(zero: T, addFn: (x: T, y: T) => T) {
        this.zeroValue = zero;
        this.add = addFn;
    }
}

// For numbers
const myGenericNumber = new GenericNumber<number>(0, (x, y) => x + y);
console.log(myGenericNumber.add(3, 4));  // Output: 7

// For strings
const stringNumeric = new GenericNumber<string>('', (x, y) => x + y);
console.log(stringNumeric.add("Hello ", "World"));  // Output: Hello World
```

### LINQ in C#

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        // Sample data
        List<Person> people = new List<Person>
        {
            new Person { Name = "Alice", Age = 25, City = "New York" },
            new Person { Name = "Bob", Age = 30, City = "Los Angeles" },
            new Person { Name = "Charlie", Age = 35, City = "Chicago" },
            new Person { Name = "Dave", Age = 40, City = "New York" },
            new Person { Name = "Eve", Age = 45, City = "Los Angeles" },
            new Person { Name = "Frank", Age = 50, City = "Chicago" }
        };
        
        // Basic filtering
        var over30 = people.Where(p => p.Age > 30);
        Console.WriteLine("People over 30:");
        foreach (var person in over30)
        {
            Console.WriteLine($"{person.Name}, {person.Age}");
        }
        
        // Ordering
        var orderedByAge = people.OrderBy(p => p.Age);
        Console.WriteLine("\nPeople ordered by age:");
        foreach (var person in orderedByAge)
        {
            Console.WriteLine($"{person.Name}, {person.Age}");
        }
        
        // Grouping
        var groupedByCity = people.GroupBy(p => p.City);
        Console.WriteLine("\nPeople grouped by city:");
        foreach (var group in groupedByCity)
        {
            Console.WriteLine($"City: {group.Key}");
            foreach (var person in group)
            {
                Console.WriteLine($"  {person.Name}, {person.Age}");
            }
        }
        
        // Projection
        var nameAndAge = people.Select(p => new { p.Name, p.Age });
        Console.WriteLine("\nNames and ages:");
        foreach (var item in nameAndAge)
        {
            Console.WriteLine($"{item.Name}, {item.Age}");
        }
        
        // Aggregation
        double averageAge = people.Average(p => p.Age);
        Console.WriteLine($"\nAverage age: {averageAge}");
        
        int maxAge = people.Max(p => p.Age);
        Console.WriteLine($"Maximum age: {maxAge}");
        
        int minAge = people.Min(p => p.Age);
        Console.WriteLine($"Minimum age: {minAge}");
    }
}

class Person
{
    public string Name { get; set; }
    public int Age { get; set; }
    public string City { get; set; }
}
```

## API Integration Examples

### RESTful API with Node.js and Express

```javascript
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// In-memory database
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// Routes
// Get all users
app.get('/api/users', (req, res) => {
    res.json(users);
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = users.find(user => user.id === id);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
});

// Create a new user
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }
    
    const newId = users.length > 0 ? Math.max(...users.map(user => user.id)) + 1 : 1;
    
    const newUser = {
        id: newId,
        name,
        email
    };
    
    users.push(newUser);
    
    res.status(201).json(newUser);
});

// Update a user
app.put('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, email } = req.body;
    
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    const updatedUser = {
        id,
        name: name || users[userIndex].name,
        email: email || users[userIndex].email
    };
    
    users[userIndex] = updatedUser;
    
    res.json(updatedUser);
});

// Delete a user
app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    users = users.filter(user => user.id !== id);
    
    res.json({ message: 'User deleted successfully' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
```

## Performance Optimization

### Memoization in JavaScript

```javascript
// Fibonacci without memoization (inefficient)
function fibonacciSlow(n) {
    if (n <= 1) return n;
    return fibonacciSlow(n - 1) + fibonacciSlow(n - 2);
}

// Fibonacci with memoization (efficient)
function fibonacciFast(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) return n;
    
    memo[n] = fibonacciFast(n - 1, memo) + fibonacciFast(n - 2, memo);
    return memo[n];
}

// Performance comparison
function timeFunction(fn, ...args) {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`Execution time: ${end - start} ms`);
    return result;
}

// Example usage
console.log("Fibonacci without memoization:");
timeFunction(fibonacciSlow, 30);  // Will take several seconds

console.log("\nFibonacci with memoization:");
timeFunction(fibonacciFast, 30);  // Will be almost instantaneous

// Generic memoization higher-order function
function memoize(fn) {
    const cache = {};
    
    return function(...args) {
        const key = JSON.stringify(args);
        
        if (key in cache) {
            console.log("Fetching from cache");
            return cache[key];
        }
        
        console.log("Computing result");
        const result = fn.apply(this, args);
        cache[key] = result;
        
        return result;
    };
}

// Example usage of generic memoization
const memoizedFibonacci = memoize(function(n) {
    if (n <= 1) return n;
    return memoizedFibonacci(n - 1) + memoizedFibonacci(n - 2);
});

console.log("\nGeneric memoized fibonacci:");
timeFunction(memoizedFibonacci, 30);  // Will be efficient
```

## Algorithm Complexity Cheat Sheet

| Algorithm | Time Complexity (Average) | Time Complexity (Worst) | Space Complexity |
|-----------|---------------------------|-------------------------|------------------|
| Quick Sort | O(n log n) | O(n²) | O(log n) |
| Merge Sort | O(n log n) | O(n log n) | O(n) |
| Heap Sort | O(n log n) | O(n log n) | O(1) |
| Bubble Sort | O(n²) | O(n²) | O(1) |
| Linear Search | O(n) | O(n) | O(1) |
| Binary Search | O(log n) | O(log n) | O(1) |
| Breadth-First Search | O(V + E) | O(V + E) | O(V) |
| Depth-First Search | O(V + E) | O(V + E) | O(V) |
| Dijkstra's Algorithm | O(V² + E) | O(V² + E) | O(V) |

Where:
- n = number of elements
- V = number of vertices
- E = number of edges

## Programming Resources

- [[#Basic Algorithms|Basic Algorithms]]
- [[#Data Structures|Data Structures]]
- [[#Design Patterns|Design Patterns]]
- [[#Language-Specific Examples|Language-Specific Examples]]
- [[#API Integration Examples|API Integration Examples]]
- [[#Performance Optimization|Performance Optimization]]

---

*This document is for testing purposes and contains code examples from various sources.*
