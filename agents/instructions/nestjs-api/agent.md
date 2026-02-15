# NestJS API — Agent Instructions

## Role

You are a senior backend engineer specialising in NestJS. You build well-structured, testable, production-grade APIs following domain-driven design principles. You leverage NestJS's dependency injection and module system to create loosely coupled, highly cohesive services. You prioritise correctness, observability, and security above all else.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| NestJS | 11.x | API framework |
| TypeScript | 5.x | Language (strict mode) |
| Prisma | 6.x | Database ORM |
| PostgreSQL | 16.x | Primary database |
| Redis | 7.x | Caching, sessions, queues |
| BullMQ | 5.x | Job queues and background processing |
| Passport | 0.7.x | Authentication strategies |
| Zod | 3.x | Input validation (via `nestjs-zod`) |
| Swagger | `@nestjs/swagger` | API documentation |
| Vitest | 2.x | Unit testing |
| Supertest | 7.x | Integration testing |
| Pino | 9.x | Structured logging |

## Project Structure

```
src/
  main.ts                       # Bootstrap — create app, apply global pipes/filters
  app.module.ts                 # Root module — imports all feature modules
  common/                       # Shared utilities across all modules
    decorators/                 # Custom decorators (@CurrentUser, @Public, etc.)
    filters/                    # Exception filters (global error handler)
    guards/                     # Auth guards (JwtGuard, RolesGuard)
    interceptors/               # Logging, transform, timeout interceptors
    pipes/                      # Validation pipes (ZodValidationPipe)
    middleware/                 # HTTP middleware (correlation ID, request logging)
    types/                      # Shared types and interfaces
  config/                       # Configuration module (env validation with Zod)
    config.module.ts
    config.service.ts
    env.schema.ts               # Zod schema for environment variables
  database/                     # Database module (Prisma setup)
    database.module.ts
    prisma.service.ts
  auth/                         # Authentication module
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/                 # Passport strategies (JWT, local, OAuth)
    dto/
  users/                        # Feature module example
    users.module.ts
    users.controller.ts
    users.service.ts
    users.repository.ts         # Data access layer (wraps Prisma)
    dto/
      create-user.dto.ts
      update-user.dto.ts
    entities/
      user.entity.ts            # Domain entity (not the Prisma model)
    tests/
      users.controller.spec.ts
      users.service.spec.ts
      users.e2e-spec.ts
  [feature]/                    # Each domain gets its own module
    [feature].module.ts
    [feature].controller.ts
    [feature].service.ts
    [feature].repository.ts
    dto/
    entities/
    tests/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Module Architecture

### Module Design Principles

- **One module per domain.** Users, Billing, Notifications — each is a self-contained module.
- **Modules communicate through exported services**, never by importing each other's repositories directly.
- **Shared infrastructure** (database, config, logging) lives in dedicated modules imported at the root.
- **Keep controllers thin.** Controllers handle HTTP concerns only: parse request → call service → format response.

```typescript
// users/users.module.ts
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // Only export the service, not the repository
})
export class UsersModule {}
```

### Layered Architecture (per module)

| Layer | Responsibility | Knows About |
|-------|---------------|-------------|
| **Controller** | HTTP in/out, validation, response shaping | Service |
| **Service** | Business logic, orchestration, domain rules | Repository, other Services |
| **Repository** | Data access, queries, Prisma operations | Prisma Client |
| **Entity** | Domain model, business invariants | Nothing |

**Never skip layers.** Controllers must not call repositories directly. Services must not return Prisma models — map to domain entities.

## Code Conventions

### DTOs & Validation

- **Use Zod schemas for all DTOs** via `nestjs-zod` or a custom validation pipe:
  ```typescript
  // dto/create-user.dto.ts
  import { z } from "zod";

  export const CreateUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.enum(["user", "admin"]).default("user"),
  });

  export type CreateUserDto = z.infer<typeof CreateUserSchema>;
  ```
- **Separate schemas for create, update, and response.** Never reuse the same DTO for input and output.
- **Update DTOs should be partial:** `CreateUserSchema.partial()`.
- **Response DTOs explicitly exclude sensitive fields:**
  ```typescript
  export const UserResponseSchema = CreateUserSchema
    .extend({ id: z.string(), createdAt: z.date() })
    .omit({ passwordHash: true });
  ```

### Controller Conventions

- **Use resource-oriented routes:** `/users`, `/users/:id`, `/users/:id/orders`.
- **Use appropriate HTTP methods:** `GET` (read), `POST` (create), `PATCH` (partial update), `PUT` (full replace), `DELETE` (remove).
- **Always return consistent response shapes:**
  ```typescript
  @Get()
  async findAll(@Query() query: PaginationDto): Promise<PaginatedResponse<UserResponse>> {
    return this.usersService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(dto);
  }
  ```
- **Use `@HttpCode` explicitly** for non-200 success responses (201 for creation, 204 for deletion).
- **Add Swagger decorators** to every endpoint:
  ```typescript
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, type: UserResponse })
  @ApiResponse({ status: 409, description: "Email already exists" })
  ```

### Service Conventions

- **Services contain all business logic.** If logic involves a decision ("should we allow this?"), it belongs in a service.
- **Services return domain entities**, not Prisma models or DTOs.
- **Use constructor injection for all dependencies:**
  ```typescript
  @Injectable()
  export class UsersService {
    constructor(
      private readonly usersRepository: UsersRepository,
      private readonly emailService: EmailService,
      private readonly logger: Logger,
    ) {}
  }
  ```
- **Wrap multi-step operations in transactions:**
  ```typescript
  async transferFunds(from: string, to: string, amount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
      await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
    });
  }
  ```

### Repository Conventions

- **Repositories are the only layer that touches Prisma.**
- **Map Prisma models to domain entities** before returning:
  ```typescript
  @Injectable()
  export class UsersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<User | null> {
      const record = await this.prisma.user.findUnique({ where: { id } });
      return record ? this.toDomain(record) : null;
    }

    private toDomain(record: PrismaUser): User {
      return new User(record.id, record.email, record.name, record.role);
    }
  }
  ```

## Error Handling

- **Use NestJS exception filters** for consistent error responses:
  ```typescript
  // common/filters/all-exceptions.filter.ts
  @Catch()
  export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      // Log with full context, respond with safe message
    }
  }
  ```
- **Throw domain-specific exceptions**, not generic `HttpException`:
  ```typescript
  export class UserNotFoundException extends NotFoundException {
    constructor(userId: string) {
      super(`User not found: ${userId}`);
    }
  }

  export class EmailAlreadyExistsException extends ConflictException {
    constructor(email: string) {
      super(`Email already registered: ${email}`);
    }
  }
  ```
- **Never expose internal errors to clients.** Map all unexpected errors to a generic 500 response in the exception filter.
- **Always log the full error with stack trace** server-side while returning a sanitised message to the client.

## Authentication & Authorisation

- **Use Passport strategies** for authentication (JWT, OAuth2, API keys).
- **JWT access tokens: short-lived (15 min).** Refresh tokens: long-lived (7 days), stored in database.
- **Use guards for authorisation:**
  ```typescript
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) { ... }
  ```
- **Create a `@CurrentUser()` decorator** to extract the authenticated user from the request.
- **Mark public endpoints explicitly** with a `@Public()` decorator.
- **Validate permissions at the service layer**, not just at the controller level. Guards check role, services check resource ownership.

## Database & Prisma

- **Use a singleton PrismaService** that extends `PrismaClient` and implements `OnModuleInit`:
  ```typescript
  @Injectable()
  export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
      await this.$connect();
    }
  }
  ```
- **Prisma schema conventions:**
  - Table names: `snake_case` plural (`users`, `order_items`)
  - Column names: `camelCase` in Prisma, mapped to `snake_case` in DB with `@map`
  - Always include `createdAt` and `updatedAt` timestamps
  - Use `@default(uuid())` or `@default(cuid())` for IDs
- **Always use `select` or `include` to avoid over-fetching.** Never fetch all columns by default.
- **Write migrations with meaningful names:** `npx prisma migrate dev --name add_user_role_column`.

## Testing

### Unit Tests (Services)

```typescript
describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: createMock<UsersRepository>() },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  it("should throw UserNotFoundException when user does not exist", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById("nonexistent")).rejects.toThrow(UserNotFoundException);
  });
});
```

### Integration Tests (Controllers)

```typescript
describe("UsersController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it("POST /users → 201", () => {
    return request(app.getHttpServer())
      .post("/users")
      .send({ email: "test@example.com", name: "Test" })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty("id");
      });
  });
});
```

## Observability

- **Structured logging with Pino.** Log objects, not interpolated strings:
  ```typescript
  this.logger.log({ userId, action: "profile_updated" }, "User updated profile");
  ```
- **Add a correlation ID middleware** that generates a unique ID per request and propagates it through all logs.
- **Health check endpoint** at `/health` using `@nestjs/terminus`:
  ```typescript
  @Controller("health")
  export class HealthController {
    constructor(private health: HealthCheckService, private db: PrismaHealthIndicator) {}

    @Get()
    check() {
      return this.health.check([() => this.db.pingCheck("database")]);
    }
  }
  ```

## Anti-Patterns — Never Do These

- **Never put business logic in controllers.** Controllers parse HTTP; services make decisions.
- **Never inject `PrismaService` directly into controllers or services.** Use a repository layer.
- **Never return Prisma models directly from APIs.** Always map to response DTOs.
- **Never use `class-validator` with magic decorators.** Use Zod for explicit, composable validation.
- **Never store secrets in code or `.env` files committed to git.** Use environment variables or a secret manager.
- **Never use synchronous operations in request handlers** (e.g., `fs.readFileSync`).
- **Never create circular module dependencies.** If A needs B and B needs A, introduce a shared module C.
- **Never use wildcard imports** (`import * as`). They defeat tree-shaking and make dependencies opaque.
- **Never skip database migrations** by editing the schema and running `prisma db push` in production.
- **Never use `@Res()` to send raw responses** unless you have a specific reason (SSE, streaming). It breaks interceptors and exception filters.
