import { Feed } from '../components/feed/Feed';
import { UserListPanel } from '../components/discover/UserListPanel';
import { useTranslation } from 'react-i18next';

export const Home = () => {
    const { t } = useTranslation();
    return (
        <div className="w-full flex gap-8">
            <div className="flex-1">
                <div className="mb-6">
                    <h1 className="text-2xl lg:text-3xl page-title-highlight">{t('common.home')}</h1>
                    <p className="text-on-surface-variant font-medium">{t('home.feed_subtitle')}</p>
                </div>
                <Feed />
            </div>

            <UserListPanel />
        </div>
    );
};
