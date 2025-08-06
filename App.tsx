import React, { useState, useCallback } from 'react';
import type { Chat } from '@google/genai';
import IDEView from './IDEView';
import WorkspaceModal from './WorkspaceModal';
import { createAIGameChatSession } from './geminiService'; // Corrected import path
import type { WorkspaceType } from './types';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    rated?: boolean;
}

const App: React.FC = () => {
    const [workspace, setWorkspace] = useState<WorkspaceType | null>(null);
    const [aiChat, setAiChat] = useState<Chat | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    const handleSelectWorkspace = useCallback((selectedWorkspace: WorkspaceType) => {
        try {
            const { chat, initialCode, welcomeMessage } = createAIGameChatSession(selectedWorkspace);
            setAiChat(chat);
            setGeneratedCode(initialCode);
            setChatHistory([{ id: `model-init-${Date.now()}`, role: 'model', text: welcomeMessage }]);
            setWorkspace(selectedWorkspace);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setChatHistory([{ id: `model-error-${Date.now()}`, role: 'model', text: `Error initializing AI: ${errorMessage}` }]);
        }
    }, []);

    const handleGenerateCode = useCallback(async (prompt: string) => {
        if (!aiChat || !prompt || isLoading || !workspace) return;

        setIsLoading(true);
        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: prompt };
        setChatHistory(prev => [...prev, userMessage]);

        try {
            // Ensure the response is handled correctly based on the expected structure from createAIGameChatSession
            const response = await aiChat.sendMessage({ message: prompt });
            // Assuming response.text might be a stringified JSON or plain text
            let explanation = '';
            let code = '';

            try {
                const jsonResponse = JSON.parse(response.text);
                explanation = jsonResponse.explanation || '';
                code = jsonResponse.code || '';
            } catch (parseError) {
                // If response.text is not JSON, treat it as a direct explanation
                explanation = response.text;
            }


            if (code) {
                setGeneratedCode(code);
            }
            if (explanation) {
                 setChatHistory(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', text: explanation }]);
            } else {
                 setChatHistory(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', text: 'Code updated successfully.' }]);
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred. The AI may have returned an invalid response.';
            setChatHistory(prev => [...prev, { id: `model-error-${Date.now()}`, role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    }, [aiChat, isLoading, workspace]);

    const handlePositiveFeedback = useCallback((messageId: string) => {
        setChatHistory(prev => {
            const newHistory = [...prev];
            const messageIndex = newHistory.findIndex(msg => msg.id === messageId);

            if (messageIndex === -1 || newHistory[messageIndex].rated) {
                return newHistory; // Message not found or already rated
            }

            // Mark original message as rated
            newHistory[messageIndex] = { ...newHistory[messageIndex], rated: true };

            // Insert feedback messages after the rated message to guide the AI
            const feedbackMessages: ChatMessage[] = [
                {
                    id: `user-feedback-${Date.now()}`,
                    role: 'user',
                    text: "That was a great update!",
                    rated: true, // Not rateable
                },
                {
                    id: `model-feedback-${Date.now()}`,
                    role: 'model',
                    text: "Great! I'll keep that in mind for future updates.",
                    rated: true, // Not rateable
                }
            ];

            newHistory.splice(messageIndex + 1, 0, ...feedbackMessages);
            return newHistory;
        }); // Added missing ')' here
    }, []);


    const handleReset = useCallback(() => {
        setWorkspace(null);
        setAiChat(null);
        setChatHistory([]);
        setGeneratedCode('');
        setIsLoading(false);
    }, []);

    if (!workspace) {
        return <WorkspaceModal onSelect={handleSelectWorkspace} />;
    }

    return (
        <div className="w-screen h-screen bg-black">
            <IDEView
                workspaceType={workspace}
                generatedCode={generatedCode}
                chatHistory={chatHistory}
                isLoading={isLoading}
                onGenerate={handleGenerateCode}
                onReset={handleReset}
                onPositiveFeedback={handlePositiveFeedback}
            />
        </div>
    );
};

export default App;

        setWorkspace(null);
        setAiChat(null);
        setChatHistory([]);
        setGeneratedCode('');
        setIsLoading(false);
    }, []);

    if (!workspace) {
        return <WorkspaceModal onSelect={handleSelectWorkspace} />;
    }

    return (
        <div className="w-screen h-screen bg-black">
            <IDEView
                workspaceType={workspace}
                generatedCode={generatedCode}
                chatHistory={chatHistory}
                isLoading={isLoading}
                onGenerate={handleGenerateCode}
                onReset={handleReset}
                onPositiveFeedback={handlePositiveFeedback}
            />
        </div>
    );
};

export default App;

        setAiChat(null);
        setChatHistory([]);
        setGeneratedCode('');
        setIsLoading(false);
    }, []);

    if (!workspace) {
        return <WorkspaceModal onSelect={handleSelectWorkspace} />;
    }

    return (
        <div className="w-screen h-screen bg-black">
            <IDEView
                workspaceType={workspace}
                generatedCode={generatedCode}
                chatHistory={chatHistory}
                isLoading={isLoading}
                onGenerate={handleGenerateCode}
                onReset={handleReset}
                onPositiveFeedback={handlePositiveFeedback}
            />
        </div>
    );
};

export default App;

