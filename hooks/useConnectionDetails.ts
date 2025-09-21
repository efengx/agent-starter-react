import { useCallback, useState } from 'react';
import { decodeJwt } from 'jose';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import { AppConfig } from '@/lib/types';

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

export default function useConnectionDetails(appConfig: AppConfig) {
  // 生成房间连接详细信息，包括：
  // - 随机房间名称
  // - 随机参与者名称
  // - 允许参与者加入房间的访问令牌
  // - 要连接的 LiveKit 服务器的 URL
  //
  // 在实际应用中，您可能会允许用户指定他们自己的参与者名称，并可能从现有房间中选择加入。

  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);

  const fetchConnectionDetails = useCallback(async () => {
    // setConnectionDetails(null);
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details',
      window.location.origin
    );

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Id': appConfig.sandboxId ?? '',
        },
        body: JSON.stringify({
          room_config: appConfig.agentName
            ? {
                agents: [{ agent_name: appConfig.agentName }],
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.log(
          `[${new Date().toLocaleTimeString()}] [Hook] [useConnectionDetails] errorData:`,
          errorData
        );
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data: ConnectionDetails = await res.json();
      setConnectionDetails(data);
      console.log(
        `[${new Date().toLocaleTimeString()}] [Hook] [useConnectionDetails] useConnectionDetails:`,
        data
      );
      return data;
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  }, [appConfig.agentName, appConfig.sandboxId]);

  // 移除自动加载, 自动加载会导致循环加载事件
  // useEffect(() => {
  //   fetchConnectionDetails();
  // }, [fetchConnectionDetails]);

  const isConnectionDetailsExpired = useCallback(() => {
    const token = connectionDetails?.participantToken;
    if (!token) {
      return true;
    }

    const jwtPayload = decodeJwt(token);
    if (!jwtPayload.exp) {
      return true;
    }
    const expiresAt = new Date(jwtPayload.exp * 1000 - ONE_MINUTE_IN_MILLISECONDS);

    const now = new Date();
    return expiresAt <= now;
  }, [connectionDetails?.participantToken]);

  const existingOrRefreshConnectionDetails = useCallback(async () => {
    if (isConnectionDetailsExpired() || !connectionDetails) {
      return fetchConnectionDetails();
    } else {
      return connectionDetails;
    }
  }, [connectionDetails, fetchConnectionDetails, isConnectionDetailsExpired]);

  return {
    connectionDetails,
    refreshConnectionDetails: fetchConnectionDetails,
    existingOrRefreshConnectionDetails,
  };
}
