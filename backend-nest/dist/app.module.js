"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_config_1 = __importDefault(require("./config/app.config"));
const ai_config_1 = __importDefault(require("./config/ai.config"));
const billing_config_1 = __importDefault(require("./config/billing.config"));
const database_config_1 = __importDefault(require("./config/database.config"));
const media_config_1 = __importDefault(require("./config/media.config"));
const queue_config_1 = __importDefault(require("./config/queue.config"));
const auth_module_1 = require("./auth/auth.module");
const courses_module_1 = require("./courses/courses.module");
const planner_module_1 = require("./planner/planner.module");
const prisma_module_1 = require("./prisma/prisma.module");
const tenants_module_1 = require("./tenants/tenants.module");
const ai_module_1 = require("./ai/ai.module");
const knowledge_base_module_1 = require("./knowledge-base/knowledge-base.module");
const media_module_1 = require("./media/media.module");
const jobs_module_1 = require("./jobs/jobs.module");
const schema_bootstrap_service_1 = require("./bootstrap/schema-bootstrap.service");
let AppModule = class AppModule {
    constructor(_schemaBootstrapService) {
        this._schemaBootstrapService = _schemaBootstrapService;
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, ai_config_1.default, billing_config_1.default, media_config_1.default, queue_config_1.default],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            courses_module_1.CoursesModule,
            media_module_1.MediaModule,
            planner_module_1.PlannerModule,
            ai_module_1.AiModule,
            knowledge_base_module_1.KnowledgeBaseModule,
            jobs_module_1.JobsModule,
        ],
        providers: [schema_bootstrap_service_1.SchemaBootstrapService],
    }),
    __metadata("design:paramtypes", [schema_bootstrap_service_1.SchemaBootstrapService])
], AppModule);
