// Auto-generated synchronized question bank (153 questions across 17 categories)
export const INTERVIEW_CATEGORIES = [
  {
    "id": "behavioral",
    "label": "Behavioral & HR"
  },
  {
    "id": "frontend",
    "label": "Frontend Development"
  },
  {
    "id": "backend",
    "label": "Backend Development"
  },
  {
    "id": "python",
    "label": "Python"
  },
  {
    "id": "cpp",
    "label": "C & C++"
  },
  {
    "id": "java",
    "label": "Java"
  },
  {
    "id": "csharp",
    "label": "C#"
  },
  {
    "id": "dotnet",
    "label": ".NET & ASP.NET Core"
  },
  {
    "id": "mern",
    "label": "MERN Stack"
  },
  {
    "id": "dsa",
    "label": "Data Structures & Algorithms"
  },
  {
    "id": "dbms",
    "label": "DBMS & SQL"
  },
  {
    "id": "os",
    "label": "Operating Systems"
  },
  {
    "id": "networks",
    "label": "Computer Networks"
  },
  {
    "id": "aiml",
    "label": "AI & Machine Learning"
  },
  {
    "id": "datascience",
    "label": "Data Science & Analytics"
  },
  {
    "id": "logic",
    "label": "Problem Solving & Logic"
  },
  {
    "id": "general",
    "label": "Graduate & Culture Fit"
  }
];

export const INTERVIEW_QUESTIONS = {
  "behavioral": [
    {
      "id": "beh-1",
      "difficulty": "beginner",
      "question": "Tell me about a time you faced a difficult bug or technical blocker in a class or personal project. How did you resolve it?",
      "tips": "Use STAR: briefly set the Situation, state your Task, detail the debugging Actions you took, and share the Result.",
      "keywords": [
        "context or project situation",
        "specific technical blocker or bug",
        "debugging or root cause investigation",
        "fix implemented and verification",
        "measurable outcome or lesson learned"
      ]
    },
    {
      "id": "beh-2",
      "difficulty": "beginner",
      "question": "Describe a group project where teammates had different opinions on how to build something. How did you handle it?",
      "tips": "Highlight active listening, objective tradeoffs, and how the team aligned on a solution.",
      "keywords": [
        "team project context",
        "differing technical opinions",
        "active listening and tradeoff discussion",
        "compromise or consensus decision",
        "final project outcome"
      ]
    },
    {
      "id": "beh-3",
      "difficulty": "beginner",
      "question": "Tell me about a time you had to learn a new tool or framework under a tight deadline.",
      "tips": "Explain how you prioritized core concepts, applied them quickly, and delivered on time.",
      "keywords": [
        "deadline context",
        "learning strategy or documentation",
        "hands-on application",
        "obstacles overcome",
        "timely delivery outcome"
      ]
    },
    {
      "id": "beh-4",
      "difficulty": "intermediate",
      "question": "Describe a situation where you received constructive criticism on your code or work. How did you respond?",
      "tips": "Show emotional maturity, receptiveness to feedback, concrete changes made, and growth.",
      "keywords": [
        "feedback context",
        "initial reaction and openness",
        "specific changes implemented",
        "verification or follow-up",
        "long-term improvement"
      ]
    },
    {
      "id": "beh-5",
      "difficulty": "intermediate",
      "question": "Tell me about a time you missed a deadline or made a mistake. How did you communicate and recover?",
      "tips": "Focus on early ownership, transparent communication, root-cause fix, and prevention.",
      "keywords": [
        "mistake or delay context",
        "taking ownership early",
        "stakeholder communication",
        "corrective action taken",
        "process change to prevent recurrence"
      ]
    },
    {
      "id": "beh-6",
      "difficulty": "intermediate",
      "question": "Give an example of when you took initiative to improve a process, codebase, or team workflow without being asked.",
      "tips": "Explain the gap you spotted, how you proposed or built the fix, and the impact.",
      "keywords": [
        "problem or inefficiency noticed",
        "proactive proposal or action",
        "collaboration or buy-in",
        "measurable improvement"
      ]
    },
    {
      "id": "beh-7",
      "difficulty": "advanced",
      "question": "Describe a high-pressure situation where requirements changed late in a project. How did you re-prioritize?",
      "tips": "Detail scope triage, tradeoff communication, risk mitigation, and final delivery.",
      "keywords": [
        "changing requirements context",
        "impact assessment and triage",
        "stakeholder alignment",
        "execution under constraints",
        "final outcome"
      ]
    },
    {
      "id": "beh-8",
      "difficulty": "advanced",
      "question": "Tell me about a time you had to mentor or unblock a teammate who was struggling with a technical task.",
      "tips": "Show empathy, structured guidance rather than taking over, and mutual growth.",
      "keywords": [
        "teammate blocker context",
        "teaching or pairing approach",
        "encouraging independence",
        "resolved outcome"
      ]
    },
    {
      "id": "beh-9",
      "difficulty": "advanced",
      "question": "Describe the most complex conflict or ambiguity you navigated in a project and how you drove clarity.",
      "tips": "Highlight structured alignment, data-driven decision making, and measurable results.",
      "keywords": [
        "ambiguous or conflicted situation",
        "structuring options and tradeoffs",
        "aligning stakeholders",
        "concrete result"
      ]
    }
  ],
  "frontend": [
    {
      "id": "fe-1",
      "difficulty": "beginner",
      "question": "What is the difference between state and props in React, and when would you lift state up to a parent component?",
      "tips": "Explain ownership/mutability and give a concrete shared-state example.",
      "keywords": [
        "props are passed from parent and read-only",
        "state is managed internally and mutable via setter",
        "lifting state up shares data between sibling components",
        "re-rendering when state or props change",
        "concrete component example"
      ]
    },
    {
      "id": "fe-2",
      "difficulty": "beginner",
      "question": "How do you make a web dashboard responsive and accessible across both desktop and mobile screens?",
      "tips": "Mention semantic HTML, keyboard navigation, contrast, CSS Grid/Flexbox, and media queries.",
      "keywords": [
        "CSS Grid or Flexbox flexible layouts",
        "media queries and mobile breakpoints",
        "semantic HTML landmarks and labels",
        "keyboard navigation and focus states",
        "color contrast and ARIA attributes"
      ]
    },
    {
      "id": "fe-3",
      "difficulty": "beginner",
      "question": "Explain the CSS Box Model and the difference between `box-sizing: content-box` and `border-box`.",
      "tips": "Cover content, padding, border, margin, and why `border-box` simplifies layouts.",
      "keywords": [
        "content padding border and margin layers",
        "content-box adds padding and border to width",
        "border-box includes padding and border inside width",
        "practical layout benefit"
      ]
    },
    {
      "id": "fe-4",
      "difficulty": "intermediate",
      "question": "How do `useEffect` dependencies work in React, and how do you avoid infinite loops or stale closures?",
      "tips": "Discuss dependency arrays, cleanup functions, and separating state/effects cleanly.",
      "keywords": [
        "dependency array controls effect execution",
        "missing or unstable dependencies cause bugs",
        "cleanup function prevents leaks or race conditions",
        "avoiding unnecessary state updates inside effects"
      ]
    },
    {
      "id": "fe-5",
      "difficulty": "intermediate",
      "question": "Compare client-side rendering (CSR), server-side rendering (SSR), and static site generation (SSG).",
      "tips": "Discuss initial load, SEO, TTFB, hydration, and use-case tradeoffs.",
      "keywords": [
        "CSR renders in browser via JavaScript",
        "SSR renders HTML per request on server",
        "SSG pre-builds HTML at build time",
        "SEO and performance tradeoffs"
      ]
    },
    {
      "id": "fe-6",
      "difficulty": "intermediate",
      "question": "How does event delegation work in the DOM, and why is it useful for large dynamic lists?",
      "tips": "Explain event bubbling, attaching one listener to a parent, and `event.target`.",
      "keywords": [
        "event bubbling from child to parent",
        "single listener on parent container",
        "reduced memory and dynamic element support",
        "checking event target"
      ]
    },
    {
      "id": "fe-7",
      "difficulty": "advanced",
      "question": "How would you diagnose and fix unnecessary re-renders and layout thrashing in a complex React dashboard?",
      "tips": "Mention React Profiler, memoization tradeoffs, state colocation, virtualization, and batched DOM reads/writes.",
      "keywords": [
        "profiling with React DevTools",
        "state colocation and splitting contexts",
        "React.memo useMemo and useCallback tradeoffs",
        "list virtualization and avoiding forced synchronous layouts"
      ]
    },
    {
      "id": "fe-8",
      "difficulty": "advanced",
      "question": "Explain Core Web Vitals (LCP, INP, CLS) and concrete techniques to optimize each one.",
      "tips": "Cover image/font optimization, main-thread responsiveness, and reserving layout dimensions.",
      "keywords": [
        "LCP measures largest content paint speed",
        "INP measures interaction responsiveness",
        "CLS measures visual layout stability",
        "concrete optimization techniques for each"
      ]
    },
    {
      "id": "fe-9",
      "difficulty": "advanced",
      "question": "How do you design a resilient frontend API layer handling retries, cancellation, and optimistic updates?",
      "tips": "Discuss AbortController, exponential backoff, rollback on failure, and loading/error states.",
      "keywords": [
        "AbortController for request cancellation",
        "retry with backoff on transient errors",
        "optimistic UI with rollback on failure",
        "consistent loading and error state handling"
      ]
    }
  ],
  "backend": [
    {
      "id": "be-1",
      "difficulty": "beginner",
      "question": "What makes an API RESTful, and how do you choose between GET, POST, PUT, PATCH, and DELETE?",
      "tips": "Cover resource-oriented URLs, idempotency, safety, and proper HTTP status codes.",
      "keywords": [
        "resource-based endpoints and statelessness",
        "GET safe and idempotent retrieval",
        "POST creates resources",
        "PUT full replace vs PATCH partial update",
        "appropriate HTTP status codes"
      ]
    },
    {
      "id": "be-2",
      "difficulty": "beginner",
      "question": "Explain the difference between authentication and authorization, and give a practical example of each.",
      "tips": "Contrast verifying identity (AuthN) with checking permissions (AuthZ).",
      "keywords": [
        "authentication verifies user identity",
        "authorization checks permissions and roles",
        "session or token example",
        "role-based access control example"
      ]
    },
    {
      "id": "be-3",
      "difficulty": "beginner",
      "question": "What is CORS, why do browsers enforce it, and how should a backend configure it safely?",
      "tips": "Explain Same-Origin Policy, `Access-Control-Allow-Origin`, preflight OPTIONS, and avoiding wildcard with credentials.",
      "keywords": [
        "Same-Origin Policy browser security",
        "CORS headers allow trusted cross-origin requests",
        "preflight OPTIONS request",
        "restricting origins instead of open wildcard"
      ]
    },
    {
      "id": "be-4",
      "difficulty": "intermediate",
      "question": "Compare session-based authentication with JWT (JSON Web Token) authentication, including security tradeoffs.",
      "tips": "Discuss server statefulness, revocation, token expiration, and HttpOnly cookies vs localStorage.",
      "keywords": [
        "sessions store state server-side and are easily revoked",
        "JWTs are stateless and self-contained",
        "revocation and expiration challenges with JWT",
        "XSS and CSRF storage considerations"
      ]
    },
    {
      "id": "be-5",
      "difficulty": "intermediate",
      "question": "How do you implement rate limiting in a backend API, and why is it important?",
      "tips": "Mention token bucket or sliding window, Redis counters, `429 Too Many Requests`, and abuse protection.",
      "keywords": [
        "prevents abuse brute-force and resource exhaustion",
        "token bucket or sliding window algorithm",
        "distributed store like Redis",
        "returning HTTP 429 with Retry-After"
      ]
    },
    {
      "id": "be-6",
      "difficulty": "intermediate",
      "question": "What is connection pooling for databases, and what happens if pool limits are misconfigured?",
      "tips": "Explain reusing TCP/DB connections, latency reduction, and pool exhaustion under load.",
      "keywords": [
        "reuses persistent database connections",
        "avoids expensive handshake overhead",
        "too small causes request queueing timeouts",
        "too large exhausts database memory"
      ]
    },
    {
      "id": "be-7",
      "difficulty": "advanced",
      "question": "How do you design idempotent payment or order-creation endpoints to safely handle network retries?",
      "tips": "Cover idempotency keys, atomic DB transactions/constraints, and returning stored responses.",
      "keywords": [
        "client-supplied idempotency key",
        "storing key and result atomically",
        "preventing duplicate side effects on retry",
        "handling concurrent duplicate requests"
      ]
    },
    {
      "id": "be-8",
      "difficulty": "advanced",
      "question": "Compare synchronous request-response APIs with asynchronous message queues (e.g., RabbitMQ/Kafka) for background jobs.",
      "tips": "Discuss latency, decoupling, backpressure, dead-letter queues, and eventual consistency.",
      "keywords": [
        "synchronous blocks caller until completion",
        "message queues decouple producers and consumers",
        "retry and dead-letter queue handling",
        "tradeoffs in complexity and eventual consistency"
      ]
    },
    {
      "id": "be-9",
      "difficulty": "advanced",
      "question": "How do you diagnose and resolve high tail latency (p99) in a production backend service?",
      "tips": "Cover distributed tracing, DB slow queries, N+1 calls, GC pauses, and caching/timeouts.",
      "keywords": [
        "structured logging metrics and distributed tracing",
        "identifying N+1 queries or lock contention",
        "timeouts circuit breakers and caching",
        "measuring p95 and p99 improvements"
      ]
    }
  ],
  "python": [
    {
      "id": "py-1",
      "difficulty": "beginner",
      "question": "What is the difference between a list and a tuple in Python, and when would you use each?",
      "tips": "Cover mutability, memory/performance, hashability as dict keys, and semantic intent.",
      "keywords": [
        "lists are mutable and tuples are immutable",
        "tuples can be dictionary keys if elements are hashable",
        "fixed heterogeneous records vs dynamic collections",
        "memory and iteration efficiency"
      ]
    },
    {
      "id": "py-2",
      "difficulty": "beginner",
      "question": "How do list comprehensions and generator expressions differ in Python?",
      "tips": "Compare eager list allocation in memory vs lazy on-demand evaluation with `yield`/generators.",
      "keywords": [
        "list comprehension builds full list in memory",
        "generator expression evaluates lazily one item at a time",
        "memory efficiency for large streams",
        "single-pass iteration behavior"
      ]
    },
    {
      "id": "py-3",
      "difficulty": "beginner",
      "question": "Explain how Python dictionaries work under the hood and why keys must be hashable.",
      "tips": "Cover hash tables, O(1) average lookup, hash collisions, and immutability of keys.",
      "keywords": [
        "hash table implementation",
        "O(1) average lookup time",
        "keys must implement __hash__ and __eq__",
        "mutable types like lists cannot be keys"
      ]
    },
    {
      "id": "py-4",
      "difficulty": "intermediate",
      "question": "What are decorators in Python, and how does `functools.wraps` help when writing them?",
      "tips": "Explain higher-order functions wrapping behavior and preserving `__name__`/`__doc__` metadata.",
      "keywords": [
        "function taking and returning a function",
        "adds cross-cutting behavior like logging or auth",
        "functools.wraps preserves wrapped metadata",
        "practical decorator example"
      ]
    },
    {
      "id": "py-5",
      "difficulty": "intermediate",
      "question": "How do context managers (`with` statement) work in Python, and how can you implement a custom one?",
      "tips": "Mention `__enter__`/`__exit__`, exception-safe resource cleanup, and `@contextlib.contextmanager`.",
      "keywords": [
        "automatic resource acquisition and cleanup",
        "__enter__ and __exit__ protocol",
        "cleanup runs even on exceptions",
        "contextlib.contextmanager alternative"
      ]
    },
    {
      "id": "py-6",
      "difficulty": "intermediate",
      "question": "Explain Python's Global Interpreter Lock (GIL) and how it affects multithreading vs multiprocessing.",
      "tips": "Cover CPython reference counting, CPU-bound vs I/O-bound workloads, and process parallelism.",
      "keywords": [
        "GIL allows one thread to execute Python bytecode at a time",
        "I/O-bound tasks still benefit from threading or asyncio",
        "CPU-bound tasks need multiprocessing or C extensions",
        "memory isolation tradeoff in multiprocessing"
      ]
    },
    {
      "id": "py-7",
      "difficulty": "advanced",
      "question": "Compare `asyncio` cooperative concurrency with `threading` and `multiprocessing` in Python.",
      "tips": "Discuss event loops, `async/await`, non-blocking I/O, and CPU-bound limitations.",
      "keywords": [
        "asyncio uses single-threaded event loop",
        "tasks yield control at await points",
        "ideal for high-concurrency I/O",
        "blocking calls stall the event loop"
      ]
    },
    {
      "id": "py-8",
      "difficulty": "advanced",
      "question": "Explain Python's descriptors and how `@property` uses the descriptor protocol.",
      "tips": "Cover `__get__`, `__set__`, `__delete__`, data vs non-data descriptors, and attribute lookup order.",
      "keywords": [
        "__get__ __set__ __delete__ methods",
        "reusable managed attribute logic",
        "property implements descriptor protocol",
        "attribute lookup precedence"
      ]
    },
    {
      "id": "py-9",
      "difficulty": "advanced",
      "question": "How do you profile and optimize a slow Python data-processing pipeline?",
      "tips": "Mention `cProfile`, algorithmic complexity, vectorization with NumPy, generators, and avoiding Python-loop overhead.",
      "keywords": [
        "profiling with cProfile or py-spy",
        "fixing algorithmic bottlenecks first",
        "vectorization with NumPy or C extensions",
        "streaming with generators to reduce memory"
      ]
    }
  ],
  "cpp": [
    {
      "id": "cpp-1",
      "difficulty": "beginner",
      "question": "What is the difference between pointers and references in C++?",
      "tips": "Cover nullability, reassignment, indirection syntax, and memory safety.",
      "keywords": [
        "pointers hold addresses and can be null or reassigned",
        "references are aliases bound at initialization",
        "pointers require dereferencing",
        "preferring references when null is invalid"
      ]
    },
    {
      "id": "cpp-2",
      "difficulty": "beginner",
      "question": "Explain stack vs heap memory allocation in C++ and the risks of manual `new`/`delete`.",
      "tips": "Discuss automatic lifetime vs dynamic lifetime, memory leaks, and dangling pointers.",
      "keywords": [
        "stack allocation is automatic and fast",
        "heap allocation has dynamic lifetime",
        "manual delete risks leaks and double-free",
        "dangling pointers after deallocation"
      ]
    },
    {
      "id": "cpp-3",
      "difficulty": "beginner",
      "question": "What is `const` correctness in C++ and why does it matter?",
      "tips": "Cover `const` variables, `const` references in parameters, and `const` member functions.",
      "keywords": [
        "prevents unintended mutation at compile time",
        "const reference avoids copying large objects",
        "const member functions promise not to mutate state",
        "improves API safety and clarity"
      ]
    },
    {
      "id": "cpp-4",
      "difficulty": "intermediate",
      "question": "Explain RAII (Resource Acquisition Is Initialization) and how smart pointers (`unique_ptr`, `shared_ptr`) implement it.",
      "tips": "Cover tying resource lifetime to object scope, deterministic destructors, and ownership semantics.",
      "keywords": [
        "resources tied to object lifetime and destructor",
        "exception-safe deterministic cleanup",
        "unique_ptr exclusive ownership",
        "shared_ptr reference-counted ownership and weak_ptr"
      ]
    },
    {
      "id": "cpp-5",
      "difficulty": "intermediate",
      "question": "How does runtime polymorphism work in C++ using `virtual` functions and vtables?",
      "tips": "Explain base pointers, vptr/vtable dispatch, `override`, and virtual destructors.",
      "keywords": [
        "virtual functions enable dynamic dispatch",
        "vtable and vptr mechanism",
        "virtual destructor prevents partial destruction",
        "override keyword catches signature mismatches"
      ]
    },
    {
      "id": "cpp-6",
      "difficulty": "intermediate",
      "question": "What is the difference between `std::vector` and `std::list` in terms of memory layout and cache performance?",
      "tips": "Compare contiguous array vs doubly-linked nodes, random access, and CPU cache locality.",
      "keywords": [
        "vector uses contiguous memory",
        "list uses heap-allocated linked nodes",
        "vector has O(1) random access and better cache locality",
        "insertion and iterator invalidation tradeoffs"
      ]
    },
    {
      "id": "cpp-7",
      "difficulty": "advanced",
      "question": "Explain move semantics, rvalue references (`&&`), and `std::move` in modern C++.",
      "tips": "Discuss transferring ownership of temporary resources instead of deep copying, and `noexcept` moves.",
      "keywords": [
        "lvalue vs rvalue references",
        "move constructor steals internal pointers",
        "std::move casts to rvalue reference",
        "avoids expensive deep copies"
      ]
    },
    {
      "id": "cpp-8",
      "difficulty": "advanced",
      "question": "Compare compile-time polymorphism (templates/concepts) with runtime virtual polymorphism in C++.",
      "tips": "Cover zero-overhead abstraction, code bloat, binary size, and heterogeneous collections.",
      "keywords": [
        "templates resolve dispatch at compile time",
        "no vtable indirection overhead",
        "virtual functions support heterogeneous runtime containers",
        "compile time and code size tradeoffs"
      ]
    },
    {
      "id": "cpp-9",
      "difficulty": "advanced",
      "question": "How do you prevent data races and deadlocks in multithreaded C++ using `std::mutex`, `std::lock_guard`, and `std::atomic`?",
      "tips": "Explain lock ordering, RAII lock wrappers, lock-free atomics, and memory ordering basics.",
      "keywords": [
        "std::lock_guard or unique_lock for exception-safe locking",
        "consistent lock ordering prevents deadlocks",
        "std::atomic for lock-free primitive operations",
        "data race causes undefined behavior"
      ]
    }
  ],
  "java": [
    {
      "id": "java-1",
      "difficulty": "beginner",
      "question": "Explain the difference between `==` and `.equals()` in Java, and why `hashCode()` must stay consistent with `equals()`.",
      "tips": "Cover reference identity vs value equality and hash-based collections like `HashMap`.",
      "keywords": [
        "== compares references for objects",
        ".equals compares logical value equality",
        "equal objects must return equal hashCodes",
        "HashMap and HashSet rely on this contract"
      ]
    },
    {
      "id": "java-2",
      "difficulty": "beginner",
      "question": "What is the difference between an interface and an abstract class in Java?",
      "tips": "Discuss multiple inheritance of types, state/fields, constructors, and default methods.",
      "keywords": [
        "class can implement multiple interfaces",
        "abstract class can hold instance state and constructors",
        "interfaces define contracts and default methods",
        "when to choose each"
      ]
    },
    {
      "id": "java-3",
      "difficulty": "beginner",
      "question": "Explain checked vs unchecked exceptions in Java and best practices for handling them.",
      "tips": "Compare compile-time checked exceptions (`IOException`) with `RuntimeException`.",
      "keywords": [
        "checked exceptions must be caught or declared",
        "unchecked extend RuntimeException",
        "avoid swallowing exceptions silently",
        "try-with-resources for AutoCloseable"
      ]
    },
    {
      "id": "java-4",
      "difficulty": "intermediate",
      "question": "How does `HashMap` work internally in Java, including collision handling and treeification?",
      "tips": "Cover `hashCode`, bucket array, equals check, load factor resizing, and Java 8 balanced trees.",
      "keywords": [
        "hashCode maps key to bucket index",
        "equals resolves collisions in bucket",
        "resizing at load factor threshold",
        "linked list converts to red-black tree on high collisions"
      ]
    },
    {
      "id": "java-5",
      "difficulty": "intermediate",
      "question": "Explain the Java Memory Model concepts of Heap vs Stack and how Garbage Collection works.",
      "tips": "Cover thread stacks, shared heap, generational GC (Young/Old), and reachability.",
      "keywords": [
        "each thread has its own stack for primitives and references",
        "objects live on shared heap",
        "garbage collector reclaims unreachable objects",
        "generational collection improves throughput"
      ]
    },
    {
      "id": "java-6",
      "difficulty": "intermediate",
      "question": "What are Java Streams, and how do intermediate vs terminal operations work?",
      "tips": "Discuss lazy evaluation, stateless pipelines, `map`/`filter` vs `collect`/`reduce`.",
      "keywords": [
        "streams process data declaratively without mutating source",
        "intermediate operations are lazy",
        "terminal operations trigger execution",
        "readability and parallel stream caveats"
      ]
    },
    {
      "id": "java-7",
      "difficulty": "advanced",
      "question": "How do `synchronized`, `volatile`, and `ReentrantLock` differ in Java concurrency?",
      "tips": "Cover mutual exclusion, visibility/happens-before, and advanced locking features like `tryLock`.",
      "keywords": [
        "volatile guarantees visibility not atomicity",
        "synchronized provides intrinsic monitor lock",
        "ReentrantLock adds tryLock fairness and interruptibility",
        "happens-before memory visibility"
      ]
    },
    {
      "id": "java-8",
      "difficulty": "advanced",
      "question": "Explain `CompletableFuture` and how you compose non-blocking asynchronous pipelines in Java.",
      "tips": "Cover `supplyAsync`, `thenApply`, `thenCompose`, `exceptionally`, and custom executor pools.",
      "keywords": [
        "non-blocking async composition",
        "thenApply transforms vs thenCompose flattens futures",
        "exception handling with exceptionally or handle",
        "using dedicated thread pools"
      ]
    },
    {
      "id": "java-9",
      "difficulty": "advanced",
      "question": "How do you diagnose a `OutOfMemoryError` or high GC pause issue in a JVM application?",
      "tips": "Mention heap dumps (`jmap`), GC logs, profiler tools, and common leak patterns like static collections or unclosed listeners.",
      "keywords": [
        "capturing heap dumps and analyzing retained objects",
        "inspecting GC logs for pause times",
        "identifying unintended strong references or caches",
        "tuning heap or fixing object retention"
      ]
    }
  ],
  "csharp": [
    {
      "id": "cs-1",
      "difficulty": "beginner",
      "question": "What is the difference between value types (`struct`) and reference types (`class`) in C#?",
      "tips": "Cover stack/inline vs heap allocation, copy-by-value vs reference copying, and boxing.",
      "keywords": [
        "value types store data directly and copy on assignment",
        "reference types store heap references",
        "structs cannot inherit from other structs or classes",
        "boxing overhead when treating value type as object"
      ]
    },
    {
      "id": "cs-2",
      "difficulty": "beginner",
      "question": "Explain `IEnumerable<T>` vs `IQueryable<T>` in C# and LINQ.",
      "tips": "Cover in-memory delegate execution vs expression-tree translation for databases.",
      "keywords": [
        "IEnumerable executes delegates in memory",
        "IQueryable builds expression trees for providers like EF Core",
        "database filtering happens server-side with IQueryable",
        "deferred execution behavior"
      ]
    },
    {
      "id": "cs-3",
      "difficulty": "beginner",
      "question": "What is the purpose of `using` statements and `IDisposable` in C#?",
      "tips": "Explain deterministic cleanup of unmanaged resources like file handles and DB connections.",
      "keywords": [
        "IDisposable exposes Dispose for unmanaged resources",
        "using ensures Dispose runs even on exceptions",
        "prevents handle and connection leaks",
        "alternative to waiting for finalizer"
      ]
    },
    {
      "id": "cs-4",
      "difficulty": "intermediate",
      "question": "How do `async` and `await` work in C#, and why should you avoid `async void` and `.Result`?",
      "tips": "Cover state machines, thread release during I/O, deadlocks in synchronization contexts, and exception handling.",
      "keywords": [
        "await yields control without blocking thread",
        "async Task allows awaiting and exception propagation",
        "async void cannot be awaited and crashes on exceptions",
        ".Result or .Wait can cause deadlocks"
      ]
    },
    {
      "id": "cs-5",
      "difficulty": "intermediate",
      "question": "Explain delegates, `Action`, `Func`, and events in C#.",
      "tips": "Discuss type-safe function pointers, built-in generic delegates, and event encapsulation.",
      "keywords": [
        "delegates are type-safe function references",
        "Action returns void while Func returns a value",
        "events restrict external invocation to += and -=",
        "used in callbacks and LINQ"
      ]
    },
    {
      "id": "cs-6",
      "difficulty": "intermediate",
      "question": "What are nullable reference types in C# and how do they help prevent `NullReferenceException`?",
      "tips": "Cover compile-time static flow analysis, `?` annotations, and null-forgiving/coalescing operators.",
      "keywords": [
        "distinguishes non-nullable from nullable reference types",
        "compiler warns on potential null dereference",
        "reduces runtime NullReferenceException",
        "null-coalescing and pattern matching"
      ]
    },
    {
      "id": "cs-7",
      "difficulty": "advanced",
      "question": "Explain `Span<T>` and `Memory<T>` in C# and when they improve performance.",
      "tips": "Cover zero-allocation slicing of arrays/strings/stack memory and `ref struct` constraints.",
      "keywords": [
        "zero-allocation view over contiguous memory",
        "reduces GC pressure from substring or array copies",
        "Span is stack-only ref struct",
        "Memory<T> works across async boundaries"
      ]
    },
    {
      "id": "cs-8",
      "difficulty": "advanced",
      "question": "How does `CancellationToken` propagate cooperative cancellation across async C# workflows?",
      "tips": "Discuss passing tokens through async calls, `ThrowIfCancellationRequested`, and avoiding wasted work.",
      "keywords": [
        "cooperative cancellation pattern",
        "propagated through async method parameters",
        "registers callbacks or throws OperationCanceledException",
        "frees server resources when client disconnects"
      ]
    },
    {
      "id": "cs-9",
      "difficulty": "advanced",
      "question": "Compare `record` types with `class` and `struct` in modern C#.",
      "tips": "Cover value-based equality, immutability (`init`), `with` expressions, and DTO/domain modeling.",
      "keywords": [
        "records provide built-in value equality",
        "non-destructive mutation via with expressions",
        "ideal for immutable DTOs and messages",
        "class vs struct record differences"
      ]
    }
  ],
  "dotnet": [
    {
      "id": "dn-1",
      "difficulty": "beginner",
      "question": "What is Dependency Injection in ASP.NET Core, and how do Transient, Scoped, and Singleton lifetimes differ?",
      "tips": "Explain IoC container registration and lifetime per resolution, HTTP request, or app lifetime.",
      "keywords": [
        "IoC container injects dependencies via constructor",
        "Transient creates new instance every time",
        "Scoped creates one instance per HTTP request",
        "Singleton lives for application lifetime"
      ]
    },
    {
      "id": "dn-2",
      "difficulty": "beginner",
      "question": "Explain the ASP.NET Core request middleware pipeline and why middleware order matters.",
      "tips": "Cover `UseRouting`, `UseAuthentication`, `UseAuthorization`, `UseExceptionHandler`, and short-circuiting.",
      "keywords": [
        "middleware forms ordered request-response pipeline",
        "each component calls next or short-circuits",
        "exception handler must wrap downstream middleware",
        "authentication runs before authorization"
      ]
    },
    {
      "id": "dn-3",
      "difficulty": "beginner",
      "question": "How does `Program.cs` minimal hosting work in modern .NET / ASP.NET Core?",
      "tips": "Discuss `WebApplication.CreateBuilder`, service registration on `builder.Services`, and pipeline setup on `app`.",
      "keywords": [
        "WebApplicationBuilder configures services and config",
        "builder.Services registers DI dependencies",
        "app.MapControllers or minimal endpoints",
        "unified host model"
      ]
    },
    {
      "id": "dn-4",
      "difficulty": "intermediate",
      "question": "What is a captive dependency bug in ASP.NET Core DI, and how do you avoid it?",
      "tips": "Explain injecting a Scoped service (like `DbContext`) into a Singleton and using `IServiceScopeFactory`.",
      "keywords": [
        "Singleton holding Scoped service keeps it alive too long",
        "causes stale state or concurrency bugs in DbContext",
        "resolve scoped services via IServiceScopeFactory",
        "built-in scope validation catches it in Development"
      ]
    },
    {
      "id": "dn-5",
      "difficulty": "intermediate",
      "question": "Compare Controller-based APIs with Minimal APIs in ASP.NET Core.",
      "tips": "Discuss boilerplate, filters/model binding, performance, and team organization tradeoffs.",
      "keywords": [
        "Controllers use MVC conventions attributes and filters",
        "Minimal APIs use concise lambda route handlers",
        "Minimal APIs have lower overhead for microservices",
        "Controllers suit large structured APIs"
      ]
    },
    {
      "id": "dn-6",
      "difficulty": "intermediate",
      "question": "How do you avoid N+1 query problems and improve performance in Entity Framework Core?",
      "tips": "Mention `.Include()`, `.AsNoTracking()`, projections with `.Select()`, and inspecting generated SQL.",
      "keywords": [
        "N+1 occurs with lazy loading inside loops",
        "eager loading with Include or explicit Select projection",
        "AsNoTracking skips change tracker overhead for reads",
        "paging and indexing"
      ]
    },
    {
      "id": "dn-7",
      "difficulty": "advanced",
      "question": "How do you implement global exception handling and RFC 7807 `ProblemDetails` in ASP.NET Core?",
      "tips": "Cover `IExceptionHandler` or exception middleware, status mapping, and hiding sensitive stack traces in Production.",
      "keywords": [
        "centralized exception handling middleware or IExceptionHandler",
        "consistent ProblemDetails JSON format",
        "maps domain exceptions to HTTP status codes",
        "omits internal stack traces in production"
      ]
    },
    {
      "id": "dn-8",
      "difficulty": "advanced",
      "question": "How do `IHostedService` and `BackgroundService` work in .NET for background tasks, and what are their pitfalls?",
      "tips": "Discuss long-running loops, `CancellationToken`, scoped service creation, and unhandled exceptions.",
      "keywords": [
        "runs background work inside .NET host",
        "must respect stoppingToken for graceful shutdown",
        "create DI scope manually for scoped services",
        "handle exceptions to avoid crashing host"
      ]
    },
    {
      "id": "dn-9",
      "difficulty": "advanced",
      "question": "How would you secure and optimize a high-throughput ASP.NET Core Web API for production?",
      "tips": "Cover response compression, output caching, rate limiting, health checks, JWT validation, and Kestrel tuning.",
      "keywords": [
        "rate limiting and JWT/OAuth validation",
        "output caching and response compression",
        "health checks for readiness and liveness",
        "async I/O and connection pooling"
      ]
    }
  ],
  "mern": [
    {
      "id": "mern-1",
      "difficulty": "beginner",
      "question": "Walk through how data flows from a React frontend through Express/Node.js to MongoDB and back.",
      "tips": "Cover HTTP fetch/Axios, Express routing/middleware, Mongoose schema/query, and JSON response.",
      "keywords": [
        "React sends HTTP request with JSON payload",
        "Express route parses body and runs middleware",
        "Mongoose validates and queries MongoDB",
        "JSON response updates React state"
      ]
    },
    {
      "id": "mern-2",
      "difficulty": "beginner",
      "question": "What is Mongoose in a MERN application, and why use schemas over raw MongoDB driver calls?",
      "tips": "Discuss schema validation, casting, middleware hooks, and model methods.",
      "keywords": [
        "ODM library modeling MongoDB documents",
        "enforces schema structure and validation",
        "provides hooks and query helpers",
        "bridges JavaScript objects and BSON documents"
      ]
    },
    {
      "id": "mern-3",
      "difficulty": "beginner",
      "question": "How does Express middleware work, and how do you write an error-handling middleware?",
      "tips": "Explain `(req, res, next)` vs 4-argument `(err, req, res, next)` error handler.",
      "keywords": [
        "middleware inspects or modifies req and res",
        "calls next to pass control",
        "error middleware has four parameters err req res next",
        "centralizes error formatting"
      ]
    },
    {
      "id": "mern-4",
      "difficulty": "intermediate",
      "question": "In MongoDB, when should you embed subdocuments vs reference another collection with `ObjectId`?",
      "tips": "Cover read/write patterns, 16MB document limit, unbounded arrays, and `$lookup` tradeoffs.",
      "keywords": [
        "embedding gives fast single-query reads for bounded data",
        "referencing avoids duplication and unbounded growth",
        "16MB BSON document limit",
        "update frequency and join complexity tradeoffs"
      ]
    },
    {
      "id": "mern-5",
      "difficulty": "intermediate",
      "question": "How do you prevent NoSQL injection and XSS vulnerabilities in a MERN stack app?",
      "tips": "Discuss input validation (Zod/Joi), sanitizing `$` operators, React escaping, and HttpOnly cookies.",
      "keywords": [
        "validate and sanitize request inputs against operator injection",
        "avoid passing raw req.body into MongoDB queries",
        "React escapes JSX by default avoid unsafe HTML",
        "store auth tokens in HttpOnly cookies"
      ]
    },
    {
      "id": "mern-6",
      "difficulty": "intermediate",
      "question": "How do you manage server state and caching in React when talking to an Express/MongoDB backend?",
      "tips": "Mention loading/error states, avoiding duplicate fetches, pagination, and tools like React Query/SWR or custom hooks.",
      "keywords": [
        "separate server cache from local UI state",
        "handle loading error and empty states",
        "cursor or page-based pagination",
        "request deduplication and stale-while-revalidate"
      ]
    },
    {
      "id": "mern-7",
      "difficulty": "advanced",
      "question": "How do you design MongoDB indexes and aggregation pipelines for fast analytics queries?",
      "tips": "Cover compound indexes (ESR rule), `explain()`, `$match` early in pipeline, and avoiding collection scans.",
      "keywords": [
        "compound indexes following Equality Sort Range",
        "using explain to verify index usage",
        "filtering early with $match in aggregation",
        "tradeoff between read speed and write overhead"
      ]
    },
    {
      "id": "mern-8",
      "difficulty": "advanced",
      "question": "How would you implement real-time updates (e.g., notifications or live chat) in a MERN architecture?",
      "tips": "Discuss WebSockets / Socket.IO, Redis pub/sub for horizontal scaling, and auth handshake.",
      "keywords": [
        "WebSocket or Socket.IO persistent connection",
        "authenticating socket handshake with token",
        "Redis adapter or pub/sub across multiple Node instances",
        "reconnection and fallback handling"
      ]
    },
    {
      "id": "mern-9",
      "difficulty": "advanced",
      "question": "How do you scale a Node.js/Express backend when CPU-intensive tasks or traffic spikes occur?",
      "tips": "Cover clustering/PM2, offloading CPU work to worker threads or queues, caching with Redis, and stateless horizontal scaling.",
      "keywords": [
        "Node event loop blocks on heavy CPU work",
        "offload CPU tasks to worker threads or job queues",
        "stateless instances behind load balancer",
        "Redis caching for hot reads"
      ]
    }
  ],
  "dsa": [
    {
      "id": "dsa-1",
      "difficulty": "beginner",
      "question": "How would you explain time and space complexity (Big O) to another student, and why does it matter in real apps?",
      "tips": "Compare O(1) vs O(n) vs O(n^2) and give a practical scaling example.",
      "keywords": [
        "time complexity measures operations growth with input size",
        "space complexity measures memory usage growth",
        "O(1) hash map vs O(n) linear scan comparison",
        "scalability impact on real datasets",
        "practical trade-off example"
      ]
    },
    {
      "id": "dsa-2",
      "difficulty": "beginner",
      "question": "If a search input filters a list of 5,000 items on every keystroke and feels sluggish, how would you optimize it?",
      "tips": "Mention debouncing, memoization, indexing, and list virtualization.",
      "keywords": [
        "debouncing or throttling input events",
        "memoizing filtered results",
        "list virtualization or pagination for DOM rendering",
        "pre-indexing or efficient data structure",
        "measuring render performance"
      ]
    },
    {
      "id": "dsa-3",
      "difficulty": "beginner",
      "question": "Explain the difference between a Stack and a Queue, and give a real-world software use case for each.",
      "tips": "Cover LIFO vs FIFO, O(1) push/pop/enqueue/dequeue, undo/call stack vs task/BFS queue.",
      "keywords": [
        "stack is LIFO last in first out",
        "queue is FIFO first in first out",
        "stack use cases like undo or call stack",
        "queue use cases like task scheduling or BFS"
      ]
    },
    {
      "id": "dsa-4",
      "difficulty": "intermediate",
      "question": "Compare Breadth-First Search (BFS) and Depth-First Search (DFS) on graphs and trees.",
      "tips": "Cover queue vs stack/recursion, shortest path in unweighted graphs, and memory tradeoffs.",
      "keywords": [
        "BFS uses queue and explores level by level",
        "DFS uses stack or recursion and explores deep paths",
        "BFS finds shortest path in unweighted graphs",
        "space complexity tradeoffs"
      ]
    },
    {
      "id": "dsa-5",
      "difficulty": "intermediate",
      "question": "How does Binary Search work, what preconditions does it require, and what are common edge-case bugs?",
      "tips": "Cover sorted order, O(log n), mid calculation overflow, and loop termination (`low <= high`).",
      "keywords": [
        "requires monotonic or sorted search space",
        "halves search space in O(log n) time",
        "avoiding integer overflow in mid calculation",
        "boundary conditions low <= high"
      ]
    },
    {
      "id": "dsa-6",
      "difficulty": "intermediate",
      "question": "Explain how a Min-Heap / Priority Queue works and how you would use it to find the Top K frequent elements.",
      "tips": "Discuss heapify/push/pop O(log k) complexity vs sorting O(n log n).",
      "keywords": [
        "complete binary tree maintaining heap property",
        "O(log n) insert and extract-min",
        "frequency map plus size-K min-heap",
        "O(n log k) better than full O(n log n) sort"
      ]
    },
    {
      "id": "dsa-7",
      "difficulty": "advanced",
      "question": "Explain Dynamic Programming: how do memoization (top-down) and tabulation (bottom-up) differ?",
      "tips": "Cover overlapping subproblems, optimal substructure, state transitions, and space optimization.",
      "keywords": [
        "overlapping subproblems and optimal substructure",
        "top-down recursion with memoization cache",
        "bottom-up iterative table filling",
        "space optimization to rolling variables"
      ]
    },
    {
      "id": "dsa-8",
      "difficulty": "advanced",
      "question": "How does Topological Sort work on a Directed Acyclic Graph (DAG), and how do you detect a cycle?",
      "tips": "Mention Kahn's algorithm (in-degrees + queue) or DFS 3-color cycle detection.",
      "keywords": [
        "orders nodes so prerequisites come first",
        "Kahn algorithm tracks in-degrees with queue",
        "cycle detected if visited count < total nodes",
        "DFS recursion stack cycle check"
      ]
    },
    {
      "id": "dsa-9",
      "difficulty": "advanced",
      "question": "Explain how you would design an LRU (Least Recently Used) Cache with O(1) `get` and `put` operations.",
      "tips": "Combine a Hash Map for O(1) lookup with a Doubly Linked List for O(1) eviction/promotion.",
      "keywords": [
        "hash map maps keys to list nodes in O(1)",
        "doubly linked list tracks recency order",
        "move accessed node to head in O(1)",
        "evict tail node when capacity exceeded"
      ]
    }
  ],
  "dbms": [
    {
      "id": "dbms-1",
      "difficulty": "beginner",
      "question": "What is the difference between a PRIMARY KEY, UNIQUE constraint, and FOREIGN KEY in SQL?",
      "tips": "Cover row identity, nullability, uniqueness, and referential integrity across tables.",
      "keywords": [
        "primary key uniquely identifies each row and cannot be null",
        "unique enforces distinct values",
        "foreign key references primary key of another table",
        "maintains referential integrity"
      ]
    },
    {
      "id": "dbms-2",
      "difficulty": "beginner",
      "question": "Explain INNER JOIN, LEFT JOIN, and RIGHT JOIN with a simple example.",
      "tips": "Describe matching rows vs preserving unmatched rows from the left or right table with NULLs.",
      "keywords": [
        "INNER JOIN returns only matching rows",
        "LEFT JOIN keeps all left rows with NULLs for unmatched right",
        "RIGHT JOIN keeps all right rows",
        "practical two-table example"
      ]
    },
    {
      "id": "dbms-3",
      "difficulty": "beginner",
      "question": "What is database normalization (1NF, 2NF, 3NF), and why is it used?",
      "tips": "Cover eliminating redundant data, update/delete anomalies, and dependency on the key.",
      "keywords": [
        "reduces data redundancy and anomalies",
        "1NF atomic values",
        "2NF removes partial dependencies",
        "3NF removes transitive dependencies"
      ]
    },
    {
      "id": "dbms-4",
      "difficulty": "intermediate",
      "question": "How do B-Tree database indexes speed up queries, and when can an index hurt performance?",
      "tips": "Explain balanced tree search O(log n), covering/composite indexes, and write amplification.",
      "keywords": [
        "B-Tree allows O(log n) sorted lookups and range scans",
        "speeds up WHERE JOIN and ORDER BY",
        "slows down INSERT UPDATE DELETE due to index maintenance",
        "unused indexes waste storage and memory"
      ]
    },
    {
      "id": "dbms-5",
      "difficulty": "intermediate",
      "question": "Explain ACID properties in database transactions with a bank transfer example.",
      "tips": "Cover Atomicity, Consistency, Isolation, and Durability.",
      "keywords": [
        "Atomicity all or nothing",
        "Consistency preserves valid constraints",
        "Isolation prevents concurrent interference",
        "Durability persists after commit"
      ]
    },
    {
      "id": "dbms-6",
      "difficulty": "intermediate",
      "question": "What is the difference between `WHERE` and `HAVING` in SQL, and in what order do they execute?",
      "tips": "Explain filtering rows before `GROUP BY` vs filtering aggregated groups after `GROUP BY`.",
      "keywords": [
        "WHERE filters individual rows before grouping",
        "HAVING filters grouped results after aggregation",
        "HAVING works with aggregate functions like COUNT or SUM",
        "logical SQL execution order"
      ]
    },
    {
      "id": "dbms-7",
      "difficulty": "advanced",
      "question": "Explain SQL transaction isolation levels (Read Committed, Repeatable Read, Serializable) and the anomalies they prevent.",
      "tips": "Cover dirty reads, non-repeatable reads, phantom reads, and MVCC/locking tradeoffs.",
      "keywords": [
        "dirty read non-repeatable read and phantom read",
        "Read Committed prevents dirty reads",
        "Repeatable Read prevents non-repeatable reads",
        "Serializable prevents phantoms with concurrency cost"
      ]
    },
    {
      "id": "dbms-8",
      "difficulty": "advanced",
      "question": "How do you read a SQL `EXPLAIN` / `EXPLAIN ANALYZE` plan to optimize a slow query?",
      "tips": "Mention sequential scans vs index scans, join strategies, cardinality estimates, and rewriting queries.",
      "keywords": [
        "identify full table sequential scans on large tables",
        "check index usage and join types",
        "compare estimated vs actual row counts",
        "add composite indexes or rewrite predicates"
      ]
    },
    {
      "id": "dbms-9",
      "difficulty": "advanced",
      "question": "Compare vertical scaling, read replicas, and horizontal sharding for scaling a relational database.",
      "tips": "Cover read-heavy scaling, replication lag, shard key selection, and cross-shard join complexity.",
      "keywords": [
        "read replicas offload read queries with eventual consistency",
        "sharding partitions data across nodes by shard key",
        "cross-shard joins and transactions become complex",
        "hot-spot shard key risks"
      ]
    }
  ],
  "os": [
    {
      "id": "os-1",
      "difficulty": "beginner",
      "question": "What is the difference between a Process and a Thread?",
      "tips": "Cover isolated address spaces vs shared memory, context-switch overhead, and fault isolation.",
      "keywords": [
        "process has isolated virtual address space",
        "threads share process heap and code",
        "thread context switch is lighter",
        "process crash does not corrupt other processes"
      ]
    },
    {
      "id": "os-2",
      "difficulty": "beginner",
      "question": "Explain what a Context Switch is and why excessive context switching hurts performance.",
      "tips": "Cover saving/restoring registers, program counter, and CPU cache/TLB cold misses.",
      "keywords": [
        "OS saves current state and loads next task state",
        "CPU registers and stack pointer updated",
        "cache and TLB invalidation overhead",
        "reduces effective throughput"
      ]
    },
    {
      "id": "os-3",
      "difficulty": "beginner",
      "question": "What is Virtual Memory and why do modern operating systems use it?",
      "tips": "Explain virtual-to-physical address translation, process isolation, and running programs larger than RAM.",
      "keywords": [
        "gives each process isolated address space",
        "maps virtual pages to physical frames",
        "enables memory protection between processes",
        "allows paging to disk when RAM is full"
      ]
    },
    {
      "id": "os-4",
      "difficulty": "intermediate",
      "question": "What are the four Coffman conditions for a Deadlock, and how can you prevent one?",
      "tips": "Cover Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait, and breaking Circular Wait via lock ordering.",
      "keywords": [
        "mutual exclusion",
        "hold and wait",
        "no preemption",
        "circular wait and breaking it with lock ordering"
      ]
    },
    {
      "id": "os-5",
      "difficulty": "intermediate",
      "question": "Compare CPU scheduling algorithms: FIFO, Round Robin, Shortest Job First, and Priority Scheduling.",
      "tips": "Discuss time quantum, fairness, starvation, and average waiting time.",
      "keywords": [
        "FIFO is simple but suffers convoy effect",
        "Round Robin uses time quantum for fairness",
        "SJF minimizes average wait time but risks starvation",
        "priority scheduling with aging"
      ]
    },
    {
      "id": "os-6",
      "difficulty": "intermediate",
      "question": "Explain Paging, Page Faults, and Thrashing in Operating Systems.",
      "tips": "Cover page tables, TLB, disk swap on page fault, and working-set exhaustion causing thrashing.",
      "keywords": [
        "paging divides memory into fixed-size pages and frames",
        "page fault occurs when page is not in RAM",
        "TLB caches recent translations",
        "thrashing spends more time swapping than executing"
      ]
    },
    {
      "id": "os-7",
      "difficulty": "advanced",
      "question": "Compare Mutexes, Semaphores, and Condition Variables for thread synchronization.",
      "tips": "Cover ownership semantics (mutex) vs signaling/counting (semaphore) vs waiting on predicates.",
      "keywords": [
        "mutex enforces exclusive ownership by locking thread",
        "semaphore is a signaling counter without strict ownership",
        "condition variable waits atomically on state predicate",
        "spurious wakeups require while loop"
      ]
    },
    {
      "id": "os-8",
      "difficulty": "advanced",
      "question": "How do System Calls transition from User Mode to Kernel Mode, and why is this separation enforced?",
      "tips": "Cover trap/interrupt instructions, privilege rings, validating pointers, and protecting hardware.",
      "keywords": [
        "user mode restricts direct hardware access",
        "system call triggers trap into kernel mode",
        "kernel validates arguments and executes safely",
        "restores user mode on return"
      ]
    },
    {
      "id": "os-9",
      "difficulty": "advanced",
      "question": "Explain Copy-on-Write (CoW) in `fork()` and how it optimizes process creation.",
      "tips": "Cover sharing read-only pages initially and duplicating a page only when either process writes.",
      "keywords": [
        "parent and child share physical pages initially",
        "pages marked read-only",
        "write triggers page fault to copy only modified page",
        "makes fork fast and memory-efficient"
      ]
    }
  ],
  "networks": [
    {
      "id": "net-1",
      "difficulty": "beginner",
      "question": "Explain the difference between TCP and UDP, and give a real-world use case for each.",
      "tips": "Cover connection-oriented reliability vs connectionless low-latency streaming.",
      "keywords": [
        "TCP is connection-oriented reliable and ordered",
        "UDP is connectionless fast with no delivery guarantee",
        "TCP used for HTTP or file transfer",
        "UDP used for video calls DNS or gaming"
      ]
    },
    {
      "id": "net-2",
      "difficulty": "beginner",
      "question": "What happens step-by-step when you type a URL into a browser and press Enter?",
      "tips": "Walk through DNS lookup, TCP handshake, TLS handshake, HTTP request/response, and rendering.",
      "keywords": [
        "DNS resolves domain to IP address",
        "TCP three-way handshake establishes connection",
        "TLS handshake for HTTPS encryption",
        "HTTP request and server response"
      ]
    },
    {
      "id": "net-3",
      "difficulty": "beginner",
      "question": "Compare HTTP status codes 2xx, 3xx, 4xx, and 5xx with common examples.",
      "tips": "Mention 200/201, 301/302, 400/401/403/404/429, and 500/502/503.",
      "keywords": [
        "2xx success like 200 OK or 201 Created",
        "3xx redirects",
        "4xx client errors like 400 401 404",
        "5xx server errors like 500 or 503"
      ]
    },
    {
      "id": "net-4",
      "difficulty": "intermediate",
      "question": "Explain the TCP 3-way handshake (`SYN`, `SYN-ACK`, `ACK`) and how flow control works.",
      "tips": "Cover sequence numbers, establishing bidirectional state, and sliding window / congestion control.",
      "keywords": [
        "client sends SYN",
        "server replies SYN-ACK",
        "client sends ACK",
        "sliding window controls receiver buffer flow"
      ]
    },
    {
      "id": "net-5",
      "difficulty": "intermediate",
      "question": "How does HTTPS / TLS protect data in transit using both asymmetric and symmetric encryption?",
      "tips": "Explain certificates, asymmetric key exchange, and fast symmetric session encryption.",
      "keywords": [
        "digital certificates verify server identity",
        "asymmetric crypto exchanges session key",
        "symmetric AES/ChaCha encrypts bulk traffic",
        "protects confidentiality and integrity"
      ]
    },
    {
      "id": "net-6",
      "difficulty": "intermediate",
      "question": "Compare HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) in terms of performance.",
      "tips": "Cover head-of-line blocking, multiplexing over single TCP connection, and QUIC over UDP.",
      "keywords": [
        "HTTP/1.1 suffers head-of-line blocking across requests",
        "HTTP/2 multiplexes streams over one TCP connection",
        "HTTP/3 uses QUIC over UDP to eliminate TCP HoL blocking",
        "faster connection setup"
      ]
    },
    {
      "id": "net-7",
      "difficulty": "advanced",
      "question": "How do DNS caching, TTL, and Anycast routing work to keep domain resolution fast and resilient?",
      "tips": "Cover recursive resolvers, authoritative servers, TTL tradeoffs, and nearest-POP routing.",
      "keywords": [
        "recursive resolver queries root TLD and authoritative servers",
        "TTL controls cache freshness vs propagation delay",
        "Anycast routes to nearest healthy server",
        "reduces latency and absorbs DDoS"
      ]
    },
    {
      "id": "net-8",
      "difficulty": "advanced",
      "question": "Compare L4 (Transport) vs L7 (Application) Load Balancers and when you would use each.",
      "tips": "Discuss packet/connection routing vs HTTP header/path inspection and TLS termination.",
      "keywords": [
        "L4 routes based on IP and TCP/UDP port without inspecting payload",
        "L7 inspects HTTP headers paths and cookies",
        "L7 supports TLS termination and smart routing",
        "L4 offers lower latency and higher raw throughput"
      ]
    },
    {
      "id": "net-9",
      "difficulty": "advanced",
      "question": "Explain how a CDN (Content Delivery Network) reduces latency and origin load, including cache invalidation strategies.",
      "tips": "Cover edge POPs, Cache-Control headers, content hashing, and stale-while-revalidate.",
      "keywords": [
        "caches static and edge assets close to users",
        "reduces RTT and origin bandwidth",
        "Cache-Control and ETag headers",
        "content-hashed filenames for instant invalidation"
      ]
    }
  ],
  "aiml": [
    {
      "id": "aiml-1",
      "difficulty": "beginner",
      "question": "What is the difference between supervised, unsupervised, and reinforcement learning?",
      "tips": "Give clear definitions and a concrete example for each paradigm.",
      "keywords": [
        "supervised uses labeled input-output pairs",
        "unsupervised finds patterns in unlabeled data",
        "reinforcement learns via rewards and environment feedback",
        "concrete examples for each"
      ]
    },
    {
      "id": "aiml-2",
      "difficulty": "beginner",
      "question": "Explain overfitting vs underfitting, and name three ways to reduce overfitting.",
      "tips": "Cover bias-variance intuition, train vs validation gap, regularization, dropout, more data, and early stopping.",
      "keywords": [
        "overfitting memorizes training noise and fails on unseen data",
        "underfitting fails to capture underlying pattern",
        "regularization dropout or early stopping",
        "more training data or simpler model"
      ]
    },
    {
      "id": "aiml-3",
      "difficulty": "beginner",
      "question": "Why do we split data into Train, Validation, and Test sets instead of just Train and Test?",
      "tips": "Explain preventing hyperparameter leakage into the final unbiased test evaluation.",
      "keywords": [
        "train fits model parameters",
        "validation tunes hyperparameters and model choice",
        "test provides unbiased final evaluation",
        "prevents data leakage"
      ]
    },
    {
      "id": "aiml-4",
      "difficulty": "intermediate",
      "question": "Why is accuracy misleading on imbalanced datasets, and how do Precision, Recall, and F1-score help?",
      "tips": "Use a fraud or medical screening example and explain false positives vs false negatives.",
      "keywords": [
        "accuracy hides minority class failures",
        "precision measures true positives among predicted positives",
        "recall measures true positives found among actual positives",
        "F1 balances precision and recall"
      ]
    },
    {
      "id": "aiml-5",
      "difficulty": "intermediate",
      "question": "Explain how text embeddings (like sentence transformers) and cosine similarity work for semantic search.",
      "tips": "Cover dense vector representations, semantic closeness vs exact keywords, and L2 normalization.",
      "keywords": [
        "maps text into dense semantic vectors",
        "similar meanings cluster closely in vector space",
        "cosine similarity measures angle between vectors",
        "captures synonyms beyond exact keyword match"
      ]
    },
    {
      "id": "aiml-6",
      "difficulty": "intermediate",
      "question": "Compare Bag-of-Words / TF-IDF with Transformer embeddings for NLP tasks.",
      "tips": "Discuss sparsity vs dense context, polysemy, compute cost, and interpretability.",
      "keywords": [
        "TF-IDF is sparse lexical weighting based on term frequency",
        "transformers capture word order and context",
        "TF-IDF is fast and interpretable",
        "embeddings handle paraphrasing better at higher compute cost"
      ]
    },
    {
      "id": "aiml-7",
      "difficulty": "advanced",
      "question": "Explain the self-attention mechanism in Transformers and why positional encoding is needed.",
      "tips": "Cover Query-Key-Value dot products, contextual weighting, parallelization, and sequence order.",
      "keywords": [
        "computes attention weights via Query Key Value",
        "captures long-range dependencies in parallel",
        "self-attention is permutation invariant",
        "positional encoding injects token order"
      ]
    },
    {
      "id": "aiml-8",
      "difficulty": "advanced",
      "question": "How does Retrieval-Augmented Generation (RAG) work, and how do you evaluate and reduce hallucinations?",
      "tips": "Cover chunking, vector retrieval, grounded context prompting, and citation/faithfulness checks.",
      "keywords": [
        "retrieves relevant documents before generation",
        "grounds LLM output in retrieved context",
        "chunking and hybrid retrieval quality",
        "evaluating faithfulness and retrieval recall"
      ]
    },
    {
      "id": "aiml-9",
      "difficulty": "advanced",
      "question": "How do you monitor an ML model in production for data drift and concept drift?",
      "tips": "Discuss input feature distribution shifts, delayed ground-truth labels, shadow testing, and retraining triggers.",
      "keywords": [
        "data drift tracks input feature distribution changes",
        "concept drift tracks changing relationship to target",
        "monitoring confidence and proxy metrics",
        "alerting and controlled retraining"
      ]
    }
  ],
  "datascience": [
    {
      "id": "ds-1",
      "difficulty": "beginner",
      "question": "Explain the difference between Mean, Median, and Mode, and when Median is preferred over Mean.",
      "tips": "Mention skewed distributions and outliers (e.g., income or latency).",
      "keywords": [
        "mean is arithmetic average",
        "median is middle value",
        "mode is most frequent value",
        "median is robust to outliers and skew"
      ]
    },
    {
      "id": "ds-2",
      "difficulty": "beginner",
      "question": "How do you handle missing values in a tabular dataset before modeling or analysis?",
      "tips": "Cover MCAR/MAR reasoning, dropping vs mean/median/mode imputation, and missingness indicator flags.",
      "keywords": [
        "investigate why values are missing",
        "drop rows or columns only when appropriate",
        "impute numeric with median or model-based methods",
        "avoid data leakage by fitting imputer on train split"
      ]
    },
    {
      "id": "ds-3",
      "difficulty": "beginner",
      "question": "What is the difference between correlation and causation, and how do you communicate it to stakeholders?",
      "tips": "Give a confounding variable example and explain controlled experiments.",
      "keywords": [
        "correlation measures statistical association",
        "causation means one variable directly drives another",
        "confounding variables can create spurious correlation",
        "experiments or A/B tests establish causation"
      ]
    },
    {
      "id": "ds-4",
      "difficulty": "intermediate",
      "question": "Walk through how you design and analyze an A/B test from hypothesis to decision.",
      "tips": "Cover null/alternative hypotheses, randomization, sample size/power, p-value, and practical significance.",
      "keywords": [
        "define clear metric and hypothesis",
        "randomly split users without contamination",
        "calculate required sample size before running",
        "check statistical and practical significance"
      ]
    },
    {
      "id": "ds-5",
      "difficulty": "intermediate",
      "question": "Explain feature scaling (Standardization vs Min-Max Normalization) and which algorithms require it.",
      "tips": "Contrast distance/gradient models (KNN, SVM, Logistic Regression) with tree-based models.",
      "keywords": [
        "standardization centers to zero mean and unit variance",
        "min-max scales to fixed range like 0 to 1",
        "required for distance-based and gradient models",
        "tree-based models are invariant to monotonic scaling"
      ]
    },
    {
      "id": "ds-6",
      "difficulty": "intermediate",
      "question": "What is data leakage in a machine learning or analytics pipeline, and give two realistic examples?",
      "tips": "Mention scaling before train/test split and target-correlated future features.",
      "keywords": [
        "using information unavailable at prediction time",
        "fitting scaler or imputer on full dataset before split",
        "including post-outcome or target-proxy columns",
        "inflates validation scores unrealistically"
      ]
    },
    {
      "id": "ds-7",
      "difficulty": "advanced",
      "question": "How do you handle severe multicollinearity in regression models, and when does it matter?",
      "tips": "Cover VIF, unstable coefficients vs prediction accuracy, regularization (Ridge/Lasso), and feature selection.",
      "keywords": [
        "correlated predictors inflate coefficient variance",
        "detected via VIF or correlation matrix",
        "matters for coefficient interpretation",
        "addressed with Ridge Lasso or dropping redundant features"
      ]
    },
    {
      "id": "ds-8",
      "difficulty": "advanced",
      "question": "Explain Multiple Hypothesis Testing (peeking / p-hacking) in product analytics and how to control false positives.",
      "tips": "Mention Bonferroni/FDR correction, sequential testing, and pre-registration of metrics.",
      "keywords": [
        "running many tests inflates family-wise false positive rate",
        "peeking early inflates Type I error",
        "Bonferroni or Benjamini-Hochberg FDR correction",
        "pre-define primary metric and stopping rule"
      ]
    },
    {
      "id": "ds-9",
      "difficulty": "advanced",
      "question": "How would you forecast a seasonal business metric (e.g., weekly signups) and validate the forecast properly?",
      "tips": "Cover time-based rolling cross-validation (no random shuffle!), trend/seasonality decomposition, and MAE/MAPE.",
      "keywords": [
        "never randomly shuffle time series splits",
        "use expanding or rolling window time-series CV",
        "capture trend seasonality and holidays",
        "evaluate with MAE RMSE or MAPE"
      ]
    }
  ],
  "logic": [
    {
      "id": "log-1",
      "difficulty": "beginner",
      "question": "You have an array of integers and a target sum. How would you find two numbers that add up to the target efficiently?",
      "tips": "Compare brute-force O(n^2) with a Hash Set/Map O(n) single-pass lookup.",
      "keywords": [
        "brute force checks pairs in O(n^2)",
        "hash map stores seen values and indices",
        "check complement target - num in O(1)",
        "reduces time complexity to O(n)"
      ]
    },
    {
      "id": "log-2",
      "difficulty": "beginner",
      "question": "How would you check if a string of brackets `()[]{}` is balanced and properly nested?",
      "tips": "Explain using a Stack, matching closing brackets against top of stack, and empty-stack check at end.",
      "keywords": [
        "use a stack for opening brackets",
        "pop and match when encountering closing bracket",
        "return false on mismatch or empty stack",
        "ensure stack is empty at end"
      ]
    },
    {
      "id": "log-3",
      "difficulty": "beginner",
      "question": "If a function works on small inputs but times out on 100,000 items, how do you systematically debug the bottleneck?",
      "tips": "Discuss measuring runtime, checking nested loops, I/O inside loops, and choosing better data structures.",
      "keywords": [
        "profile or time sections to locate bottleneck",
        "look for O(n^2) nested loops or repeated scans",
        "replace linear scans with hash map or set",
        "verify on large synthetic input"
      ]
    },
    {
      "id": "log-4",
      "difficulty": "intermediate",
      "question": "How do you merge overlapping time intervals (e.g., calendar meetings) in optimal time?",
      "tips": "Cover sorting by start time O(n log n) and linear merge pass checking `current.start <= prev.end`.",
      "keywords": [
        "sort intervals by start time",
        "compare current start with previous merged end",
        "merge by taking max end time",
        "O(n log n) time complexity"
      ]
    },
    {
      "id": "log-5",
      "difficulty": "intermediate",
      "question": "Explain the Two Pointers technique and give two problems where it reduces O(n^2) to O(n).",
      "tips": "Mention sorted two-sum, removing duplicates in-place, or container with most water.",
      "keywords": [
        "maintains two indices moving based on condition",
        "avoids nested inner loops",
        "works on sorted arrays or palindromes",
        "O(n) time and O(1) extra space"
      ]
    },
    {
      "id": "log-6",
      "difficulty": "intermediate",
      "question": "How does the Sliding Window pattern work for finding the longest substring without repeating characters?",
      "tips": "Explain expanding right pointer, shrinking left pointer on duplicate using a map/set, and tracking max length.",
      "keywords": [
        "right pointer expands window",
        "hash map tracks last seen index of characters",
        "left pointer jumps past duplicate",
        "O(n) single-pass solution"
      ]
    },
    {
      "id": "log-7",
      "difficulty": "advanced",
      "question": "How would you find the median of a continuous stream of incoming numbers in real time?",
      "tips": "Cover two heaps: Max-Heap for lower half and Min-Heap for upper half, keeping sizes balanced within 1.",
      "keywords": [
        "maintain max-heap for smaller half and min-heap for larger half",
        "keep heap sizes balanced within 1 element",
        "insert in O(log n) time",
        "read median from heap tops in O(1)"
      ]
    },
    {
      "id": "log-8",
      "difficulty": "advanced",
      "question": "How do you detect whether a linked list has a cycle and find the exact node where the cycle begins?",
      "tips": "Explain Floyd's Tortoise and Hare (fast/slow pointers) and resetting one pointer to head.",
      "keywords": [
        "slow moves 1 step and fast moves 2 steps",
        "meeting proves a cycle exists in O(1) space",
        "reset one pointer to head and advance both by 1",
        "second meeting point is cycle entry"
      ]
    },
    {
      "id": "log-9",
      "difficulty": "advanced",
      "question": "Design an algorithm to rate-limit requests per user (e.g., max 100 requests per 60 seconds) accurately.",
      "tips": "Compare fixed window boundary burst issue vs sliding window log/counter or token bucket.",
      "keywords": [
        "fixed window allows boundary burst",
        "sliding window or token bucket smooths traffic",
        "O(1) memory with token bucket",
        "evict expired timestamps cleanly"
      ]
    }
  ],
  "general": [
    {
      "id": "gen-1",
      "difficulty": "beginner",
      "question": "Why are you interested in this entry-level role, and what kind of team environment helps you learn fastest?",
      "tips": "Connect your projects/coursework to the role and highlight openness to feedback.",
      "keywords": [
        "alignment between coursework or projects and the role",
        "growth mindset and curiosity",
        "openness to code reviews and feedback",
        "collaborative team environment",
        "desire to contribute and take ownership"
      ]
    },
    {
      "id": "gen-2",
      "difficulty": "beginner",
      "question": "What is a recent technology or concept you taught yourself outside of class, and how did you apply it?",
      "tips": "Describe your learning process, a challenge you solved, and what you built.",
      "keywords": [
        "self-directed learning motivation",
        "learning process using docs or tutorials",
        "hands-on project application",
        "challenge overcome while learning",
        "reflection on outcome"
      ]
    },
    {
      "id": "gen-3",
      "difficulty": "beginner",
      "question": "How do you organize your time when juggling multiple coursework deadlines, projects, and interview prep?",
      "tips": "Explain prioritization, breaking down tasks, time-blocking, and tracking progress.",
      "keywords": [
        "prioritizing by deadline and impact",
        "breaking large tasks into small milestones",
        "consistent schedule or time-blocking",
        "adjusting when unexpected blockers arise"
      ]
    },
    {
      "id": "gen-4",
      "difficulty": "intermediate",
      "question": "What does good code review etiquette look like to you, both as an author and as a reviewer?",
      "tips": "Cover small PRs, clear descriptions, constructive/kind feedback focused on code not person, and automated checks.",
      "keywords": [
        "keeping pull requests small and focused",
        "explaining context and testing done",
        "constructive objective feedback on code",
        "learning from reviewer suggestions"
      ]
    },
    {
      "id": "gen-5",
      "difficulty": "intermediate",
      "question": "Describe a project you are most proud of. If you had two more weeks, what would you improve?",
      "tips": "Show ownership, awareness of technical tradeoffs, testing/UX gaps, and clear next steps.",
      "keywords": [
        "project goal and your personal contribution",
        "technical decisions and tradeoffs made",
        "honest reflection on limitations",
        "concrete prioritized improvements"
      ]
    },
    {
      "id": "gen-6",
      "difficulty": "intermediate",
      "question": "How do you approach debugging an unfamiliar codebase on your first week in a new team?",
      "tips": "Discuss reading docs/tests, reproducing locally, tracing entry points, and asking focused questions.",
      "keywords": [
        "reproducing the issue locally first",
        "reading tests logs and entry points",
        "forming hypotheses before asking for help",
        "documenting findings for the team"
      ]
    },
    {
      "id": "gen-7",
      "difficulty": "advanced",
      "question": "How do you balance shipping features quickly for a deadline vs maintaining clean architecture and tests?",
      "tips": "Cover pragmatic tradeoffs, isolating tech debt, critical-path tests, and follow-up cleanup.",
      "keywords": [
        "assessing business urgency vs long-term risk",
        "keeping core tests and safety checks",
        "documenting intentional technical debt",
        "scheduling follow-up refactoring"
      ]
    },
    {
      "id": "gen-8",
      "difficulty": "advanced",
      "question": "What makes an engineering team effective, and how can a junior engineer actively contribute to team culture?",
      "tips": "Mention psychological safety, clear communication, documentation, reliability, and curiosity.",
      "keywords": [
        "clear communication and shared ownership",
        "writing helpful docs and tests",
        "asking thoughtful questions and unblocking others",
        "fostering respectful collaboration"
      ]
    },
    {
      "id": "gen-9",
      "difficulty": "advanced",
      "question": "Where do you want to grow technically over the next 1–2 years, and how are you preparing for it today?",
      "tips": "Connect concrete learning goals (systems, testing, domain depth) to current habits.",
      "keywords": [
        "specific realistic 1 to 2 year growth goals",
        "alignment with target role",
        "current deliberate practice habits",
        "seeking mentorship and feedback"
      ]
    }
  ]
};
