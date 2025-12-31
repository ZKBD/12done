import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { RecommendationsController } from './recommendations.controller';
import { SearchAgentsService } from './search-agents.service';
import { SearchAgentDigestService } from './search-agent-digest.service';
import { FavoritesService } from './favorites.service';
import { BrowsingHistoryService } from './browsing-history.service';
import { RecommendationsService } from './recommendations.service';
import { VoiceSearchService } from './voice-search.service';
import { MailModule } from '@/mail';

@Module({
  imports: [MailModule],
  controllers: [SearchController, RecommendationsController],
  providers: [
    SearchAgentsService,
    SearchAgentDigestService,
    FavoritesService,
    BrowsingHistoryService,
    RecommendationsService,
    VoiceSearchService,
  ],
  exports: [
    SearchAgentsService,
    SearchAgentDigestService,
    FavoritesService,
    BrowsingHistoryService,
    RecommendationsService,
    VoiceSearchService,
  ],
})
export class SearchModule {}
