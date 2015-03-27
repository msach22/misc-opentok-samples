//
//  OTSSessionDelegate.h
//  opentok
//
//  Created by rpc on 16/02/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

#import <Foundation/Foundation.h>
@import opentokc;

typedef void (^connectedBlock)(void);

@interface OTSSessionDelegate : NSObject

@property (nonatomic, strong)connectedBlock connected;

- (otc_session_cb *)cCallbackWrapper;

@end
